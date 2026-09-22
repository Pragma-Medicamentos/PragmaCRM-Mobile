import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';

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

/**
 * Pide permiso de ubicacion en primer plano y, si se concede, escucha la
 * posicion del dispositivo con `Location.watchPositionAsync`.
 *
 * `Accuracy.Balanced` (~100m) en vez de `Accuracy.High` (~10m) a proposito:
 * esta pantalla no da indicaciones giro a giro (eso lo resuelve el deep link
 * de Google Maps una vez que el vendedor lo abre), solo necesita ubicarlo en
 * el mapa y ordenar/mostrar distancias en las tarjetas. `Accuracy.High`
 * mantiene el GPS en su modo de mayor consumo todo el tiempo que la pantalla
 * esta abierta -- una queja de bateria esperando a pasar para algo que no lo
 * necesita.
 *
 * Se usa desde mas de una pantalla ((tabs)/index.tsx para el mapa, stops.tsx
 * para las tarjetas): cada montaje abre su propia suscripcion y la cierra al
 * desmontar, en vez de compartir un singleton -- son paradas de la misma app
 * que rara vez estan montadas a la vez (stops.tsx es un formSheet sobre
 * index.tsx), asi que el costo de una segunda suscripcion cuando si lo estan
 * es minimo comparado con la complejidad de coordinar un estado global.
 */
export function useDeviceLocation(): DeviceLocationState {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      if (status !== 'granted') {
        setPermissionDenied(true);
        return;
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: DISTANCE_INTERVAL_METERS },
        (position) => {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
      );

      // El componente pudo desmontarse mientras `watchPositionAsync`
      // todavia estaba en vuelo -- sin este chequeo la suscripcion quedaria
      // viva y sin nadie que la cierre (el cleanup de abajo ya corrio con
      // `subscriptionRef.current` en null).
      if (cancelled) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;
    }

    void start();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  return { location, permissionDenied };
}
