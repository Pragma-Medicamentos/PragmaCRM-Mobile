import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { readPreciseLocation } from '@/hooks/use-device-location';
import { ApiError } from '@/lib/api';
import type { DailyRouteStop } from '@/lib/daily-route';
import { formatDistance } from '@/lib/distance';
import { setStopLocation } from '@/lib/stop-location';
import { isPreciseEnoughToPin, visitGateMessage } from '@/lib/visit-gate';

/**
 * Texto para cada error del endpoint. Los mensajes del servidor estan en
 * ingles (son para el log, no para el vendedor), asi que se traducen por
 * status. Los de status 0 ya los arma `apiFetch` en español (sin red,
 * timeout) y se muestran tal cual.
 */
function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudo guardar la ubicación.';

  switch (error.status) {
    case 0:
      return error.message;
    case 403:
    case 404:
      return 'Esta parada ya no está en tu ruta. Actualizá la lista y probá de nuevo.';
    case 422:
      return 'La ubicación no es lo bastante precisa. Salí a cielo abierto y probá de nuevo.';
    default:
      return 'No se pudo guardar la ubicación.';
  }
}

/**
 * "Establecer ubicación" de una parada sin pin (PCRM-160): confirma, lee el
 * GPS con precision alta y guarda la posicion como la del cliente.
 *
 * La confirmacion va antes de leer, no despues: el vendedor tiene que decidir
 * si esta parado en el local, y eso no depende de lo que diga el GPS. El pin
 * no se puede corregir desde la app, asi que el aviso lo dice explicitamente.
 *
 * `onSaved` se llama tanto al guardar como con un 409 (el cliente ya tenia
 * pin, por ejemplo porque otro vendedor o el admin lo cargo mientras tanto):
 * en los dos casos lo que falta es refrescar la ruta, que es lo que cambia el
 * boton a "Validar visita (GPS)".
 */
export function useSetStopLocation(onSaved: () => Promise<unknown>) {
  const [settingLocationId, setSettingLocationId] = useState<string | null>(null);

  const save = useCallback(
    async (stop: DailyRouteStop) => {
      setSettingLocationId(stop.id);

      try {
        const read = await readPreciseLocation();

        if (read.status !== 'ok') {
          Alert.alert('No se pudo establecer la ubicación', visitGateMessage(read));
          return;
        }

        const accuracyMeters = read.accuracyMeters;

        if (accuracyMeters === null || !isPreciseEnoughToPin(accuracyMeters)) {
          const detail = accuracyMeters === null ? '' : ` (±${formatDistance(accuracyMeters)})`;
          Alert.alert(
            'Precisión insuficiente',
            `La lectura del GPS no es lo bastante precisa${detail}. Salí a cielo abierto y probá de nuevo.`,
          );
          return;
        }

        try {
          await setStopLocation({
            scheduledVisitId: stop.id,
            location: read.location,
            accuracyMeters,
          });
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 409)) {
            Alert.alert('No se pudo establecer la ubicación', errorMessage(error));
            return;
          }
        }

        await onSaved();
        Alert.alert('Ubicación establecida', 'Ya podés validar la visita.');
      } finally {
        setSettingLocationId(null);
      }
    },
    [onSaved],
  );

  const setLocation = useCallback(
    (stop: DailyRouteStop) => {
      Alert.alert(
        'Establecer ubicación',
        `Se guardará tu ubicación actual como la de ${stop.name}. Asegurate de estar en el local: después no se podrá cambiar desde la app.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Establecer', onPress: () => void save(stop) },
        ],
      );
    },
    [save],
  );

  return { settingLocationId, setLocation };
}
