import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import type { StopCustomerMetrics } from '@/lib/customer-metrics';
import { fetchStopCustomerMetrics, type DailyRouteStop } from '@/lib/daily-route';

export type StopCustomerMetricsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; metrics: StopCustomerMetrics }
  | { status: 'error'; message: string };

/**
 * Texto para cada error. Los mensajes del servidor estan en ingles, asi que se
 * traducen por status; los de status 0 (sin red, timeout) ya vienen en
 * español desde `apiFetch`.
 */
function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'No se pudieron cargar las métricas.';

  switch (error.status) {
    case 0:
      return error.message;
    case 403:
    case 404:
      return 'Esta parada ya no está en tu ruta. Actualizá la lista y probá de nuevo.';
    default:
      return 'No se pudieron cargar las métricas.';
  }
}

/**
 * Carga las metricas del cliente de la parada abierta en el detalle.
 *
 * Solo para clientes: un prospecto no tiene ventas ni visitas y el endpoint
 * responde 422, asi que ni se pide. Se vuelve a pedir al cambiar de parada y
 * cuando la parada pasa a visitada, porque eso mueve "Última visita" y la
 * conversion. Un refresco de la ruta que no toca la parada no dispara nada.
 *
 * Cambiar de parada con una peticion en vuelo la aborta: sin eso, una
 * respuesta lenta de la parada anterior podria pisar la de la actual.
 */
export function useStopCustomerMetrics(stop: DailyRouteStop | null) {
  const [attempt, setAttempt] = useState(0);
  // Cada resultado guarda la peticion a la que responde. Mientras no coincida
  // con la actual se esta cargando: asi "loading" se deriva en el render y el
  // efecto solo escribe estado cuando la respuesta llega.
  const [result, setResult] = useState<{
    key: string;
    state: StopCustomerMetricsState;
  } | null>(null);

  const stopId = stop?.target_kind === 'customer' ? stop.id : null;
  const completedAt = stop?.completed_at ?? null;
  const key = stopId ? `${stopId}|${completedAt}|${attempt}` : null;

  useEffect(() => {
    if (!stopId || !key) return;

    const controller = new AbortController();

    fetchStopCustomerMetrics(stopId, controller.signal).then(
      (metrics) => {
        if (!controller.signal.aborted) {
          setResult({ key, state: { status: 'ready', metrics } });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, state: { status: 'error', message: errorMessage(error) } });
        }
      },
    );

    return () => controller.abort();
  }, [stopId, key]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  let state: StopCustomerMetricsState;
  if (!key) state = { status: 'idle' };
  else if (result?.key === key) state = result.state;
  else state = { status: 'loading' };

  return { state, retry };
}
