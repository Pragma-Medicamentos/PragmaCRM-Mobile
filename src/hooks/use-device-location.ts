import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import type { Coordinates } from '@/lib/distance';

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
  /** true solo cuando el usuario denego el permiso explicitamente. */
  permissionDenied: boolean;
};

type Listener = (state: DeviceLocationState) => void;

const listeners = new Set<Listener>();
let snapshot: DeviceLocationState = { location: null, permissionDenied: false };
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
