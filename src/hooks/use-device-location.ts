import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/lib/distance';
import type { LocationRead } from '@/lib/visit-gate';

/**
 * Cada cuantos metros de desplazamiento se pide una nueva lectura de GPS.
 * Con el vendedor caminando o manejando entre paradas, recalcular en cada
 * micro-ruido del sensor (unos pocos metros) no cambia la distancia mostrada
 * en la tarjeta de forma perceptible -- solo gasta bateria y CPU.
 */
const DISTANCE_INTERVAL_METERS = 25;

export type DeviceLocationState = {
  /**
   * Null mientras no hay fix todavia (permiso pendiente o recien concedido)
   * o si el permiso fue denegado. Nunca revienta: el estado inicial ya es
   * "sin ubicacion", asi que negar el permiso deja la app en el mismo
   * estado con el que arranco -- ver el comentario de StopCard sobre la
   * degradacion del subtitulo.
   */
  location: Coordinates | null;
  /**
   * Precision informada por el sistema para `location`, en metros. Null
   * mientras no hay lectura. La guarda el watch porque `readPreciseLocation`
   * la usa de respaldo y necesita poder decir cuan confiable es.
   */
  accuracyMeters: number | null;
  /** true solo cuando el usuario denego el permiso explicitamente. */
  permissionDenied: boolean;
};

type Listener = (state: DeviceLocationState) => void;

const listeners = new Set<Listener>();
let snapshot: DeviceLocationState = {
  location: null,
  accuracyMeters: null,
  permissionDenied: false,
};
let subscription: Location.LocationSubscription | null = null;
let startPromise: Promise<void> | null = null;

function publish(partial: Partial<DeviceLocationState>) {
  snapshot = { ...snapshot, ...partial };
  for (const listener of listeners) listener(snapshot);
}

/** Un solo `watchPositionAsync` aunque mapa y hoja estén montados a la vez. */
function ensureWatch(): Promise<void> {
  if (subscription) return Promise.resolve();
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (listeners.size === 0) return;

    if (status !== 'granted') {
      publish({ permissionDenied: true });
      return;
    }

    try {
      const last = await Location.getLastKnownPositionAsync();
      if (listeners.size === 0) return;
      if (last && !snapshot.location) {
        publish({
          location: { lat: last.coords.latitude, lng: last.coords.longitude },
          accuracyMeters: last.coords.accuracy ?? null,
          permissionDenied: false,
        });
      }
    } catch {
      // Servicios apagados: el watch deja `location` en null.
    }

    if (listeners.size === 0 || subscription) return;

    const next = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: DISTANCE_INTERVAL_METERS },
      (position) => {
        publish({
          location: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracyMeters: position.coords.accuracy ?? null,
          permissionDenied: false,
        });
      },
    );

    if (listeners.size === 0) {
      next.remove();
      return;
    }

    subscription = next;
  })().finally(() => {
    startPromise = null;
  });

  return startPromise;
}

/**
 * Pide permiso de ubicación en primer plano y escucha la posición con un único
 * `Location.watchPositionAsync`. La hoja de paradas no abre otro watcher: recibe
 * esta misma lectura.
 *
 * `Accuracy.Balanced` (~100 m) en vez de `Accuracy.High` (~10 m): no hay
 * indicaciones giro a giro, solo ubicación y distancias.
 */
export function useDeviceLocation(): DeviceLocationState {
  const [state, setState] = useState(snapshot);

  useEffect(() => {
    listeners.add(setState);
    void ensureWatch();

    return () => {
      listeners.delete(setState);
      if (listeners.size === 0) {
        subscription?.remove();
        subscription = null;
      }
    };
  }, []);

  return state;
}

/**
 * Cuanto se espera un fix fresco antes de rendirse y usar el ultimo conocido.
 *
 * `getCurrentPositionAsync` NO tiene timeout propio: si el GPS no consigue
 * fix, la promesa no resuelve nunca. Visto en emulador -- la llamada arranca
 * y no vuelve ni con exito ni con error -- y le pasaria igual a un vendedor
 * dentro de una farmacia con techo de lamina: la hoja se quedaria en "sin
 * señal" con el boton muerto y sin forma de salir.
 */
const PRECISE_READ_TIMEOUT_MS = 10_000;

/** Cuan viejo puede ser el ultimo fix conocido para todavia servir de respaldo. */
const LAST_KNOWN_MAX_AGE_MS = 60_000;

/** Resuelve a null si `promise` no termina dentro de `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Lectura puntual de alta precision, para el momento de confirmar una visita.
 *
 * El watch de arriba usa `Accuracy.Balanced` (~100 m) y esta bien asi para lo
 * que hace: mostrar "a 12.2km" en la tarjeta. Pero el radio de validacion son
 * 80 m, o sea que esa lectura es mas gruesa que la decision que tendria que
 * tomar -- un vendedor parado en la puerta puede leerse a 150 m, y uno a
 * 200 m puede leerse adentro. La compuerta seria ruido, no verificacion.
 *
 * Por eso aca se pide `Accuracy.High` (~10 m) una sola vez, en vez de subirle
 * la precision al watch: el watch corre todo el dia y subirlo costaria bateria
 * durante horas para un dato que solo importa en el instante del toque.
 *
 * Devuelve tambien la precision informada por el sistema, porque una lectura
 * con ±100 m no puede decidir un radio de 80 m y quien la consuma tiene que
 * poder verlo en vez de tratarla como si fuera exacta.
 */
export async function readPreciseLocation(): Promise<LocationRead> {
  let status: string;

  try {
    ({ status } = await Location.getForegroundPermissionsAsync());
    if (status !== 'granted') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
  } catch {
    return { status: 'unavailable' };
  }

  if (status !== 'granted') {
    publish({ permissionDenied: true });
    return { status: 'denied' };
  }

  // Primero un fix fresco y preciso; si no llega a tiempo, el ultimo
  // conocido. `withTimeout` es lo unico que garantiza que esto termine.
  let position: Location.LocationObject | null = null;

  try {
    position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      PRECISE_READ_TIMEOUT_MS,
    );
  } catch {
    position = null;
  }

  if (!position) {
    try {
      position = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
      });
    } catch {
      position = null;
    }
  }

  if (position) {
    const location = { lat: position.coords.latitude, lng: position.coords.longitude };
    const accuracyMeters = position.coords.accuracy ?? null;

    // La lectura buena tambien sirve para la distancia de las tarjetas: seria
    // raro que la hoja diga "a 25m" y la tarjeta de atras siga en el valor
    // viejo del watch.
    publish({ location, accuracyMeters, permissionDenied: false });

    return { status: 'ok', location, accuracyMeters };
  }

  // Ultimo respaldo: lo que el watch ya venia recibiendo.
  //
  // Suena redundante teniendo `getLastKnownPositionAsync` arriba, y no lo es:
  // las dos anteriores abren una peticion NUEVA al proveedor, y hay
  // proveedores que solo alimentan suscripciones vivas -- el de prueba del
  // emulador es uno, y con el la hoja decia "no se pudo obtener tu ubicacion"
  // mientras el punto azul del mapa, alimentado por el watch, estaba ahi
  // mismo. Contradecir en pantalla algo que la propia app ya sabe es peor que
  // una lectura menos precisa.
  //
  // Se devuelve con la precision real del watch (`Accuracy.Balanced`, del
  // orden de 100 m), no como si fuera exacta: `visitGateMessage` la muestra
  // cuando no alcanza para sostener el radio.
  if (snapshot.location) {
    return {
      status: 'ok',
      location: snapshot.location,
      accuracyMeters: snapshot.accuracyMeters,
    };
  }

  return { status: 'unavailable' };
}
