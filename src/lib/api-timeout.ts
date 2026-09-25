/** Tiempo máximo de una llamada a PragmaCRM-Api antes de abortar. */
export const DEFAULT_API_TIMEOUT_MS = 20_000;

export const API_TIMEOUT_MESSAGE = 'La solicitud tardó demasiado. Intenta de nuevo.';

export type ArmedRequestTimeout = {
  signal: AbortSignal;
  clear: () => void;
  didTimeOut: () => boolean;
};

/**
 * Arma un `AbortSignal` que se dispara a los `timeoutMs`.
 *
 * Equivale a `AbortSignal.timeout`, pero se puede desarmar: esa API no se
 * cancela, y abortar la señal después de que `fetch` ya respondió cortaría
 * la lectura del cuerpo. Si el llamador trae su propia señal, cualquiera de
 * las dos aborta la petición.
 */
export function armRequestTimeout(
  timeoutMs: number = DEFAULT_API_TIMEOUT_MS,
  callerSignal?: AbortSignal | null,
): ArmedRequestTimeout {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    const reason = new Error(API_TIMEOUT_MESSAGE);
    reason.name = 'TimeoutError';
    controller.abort(reason);
  }, timeoutMs);

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason);
    } else {
      callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), {
        once: true,
      });
    }
  }

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
    didTimeOut: () => timedOut,
  };
}

/** True si el fallo viene del temporizador, aunque `fetch` lo envuelva en `cause`. */
export function isTimeoutFailure(error: unknown, timedOut: boolean): boolean {
  if (timedOut) return true;
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if ('name' in current && (current as { name?: unknown }).name === 'TimeoutError') return true;
    current = 'cause' in current ? (current as { cause?: unknown }).cause : undefined;
  }
  return false;
}
