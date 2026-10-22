import { create } from 'zustand';

import { ApiError } from '@/lib/api';
import { isSessionUnauthorized } from '@/lib/request-config';
import { fetchRouteHistory, type RouteHistoryDay } from '@/lib/route-history';
import { appendHistoryPage } from '@/lib/route-history-format';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Estado del historial de rutas (PCRM-203). Mismo contrato que
 * `weekly-route-store`: `pending` es solo la primera carga y un refresh usa
 * `refreshing`, asi la lista no se desmonta con cada refresco. Las paginas
 * siguientes usan `loadingMore`, y un error al traer una no tira las que ya
 * estan en pantalla: queda en `loadMoreError` para reintentar al pie.
 */
export type HistoryState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; days: RouteHistoryDay[]; nextBefore: string | null }
  | { status: 'error'; error: ApiError };

interface RouteHistoryStore {
  history: HistoryState;
  refreshing: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  /** Primera pagina, o refresco desde el dia mas reciente. */
  loadHistory: () => Promise<void>;
  /** Siguiente pagina. No hace nada si no hay mas o ya se esta cargando. */
  loadMore: () => Promise<void>;
}

const toApiError = (error: unknown): ApiError =>
  error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.');

export const useRouteHistoryStore = create<RouteHistoryStore>((set, get) => ({
  history: { status: 'idle' },
  refreshing: false,
  loadingMore: false,
  loadMoreError: null,

  async loadHistory() {
    const alreadyLoaded = get().history.status === 'ready';
    if (alreadyLoaded) {
      set({ refreshing: true });
    } else {
      set({ history: { status: 'pending' } });
    }

    try {
      const page = await fetchRouteHistory();
      set({
        history: { status: 'ready', days: page.days, nextBefore: page.next_before },
        refreshing: false,
        loadMoreError: null,
      });
    } catch (error) {
      const apiError = toApiError(error);

      // La sesion ya se cerro en apiFetch: el destino es el login.
      if (isSessionUnauthorized(apiError.status, apiError.message)) {
        set({ refreshing: false });
        return;
      }

      set({
        history: alreadyLoaded ? get().history : { status: 'error', error: apiError },
        refreshing: false,
      });
    }
  },

  async loadMore() {
    const { history, loadingMore, refreshing } = get();
    if (history.status !== 'ready' || !history.nextBefore || loadingMore || refreshing) return;

    set({ loadingMore: true, loadMoreError: null });

    try {
      const page = await fetchRouteHistory(history.nextBefore);
      const current = get().history;
      // Un refresh o un cierre de sesion pudo cambiar la lista mientras tanto.
      if (current.status !== 'ready' || current.nextBefore !== history.nextBefore) {
        set({ loadingMore: false });
        return;
      }

      set({
        history: {
          status: 'ready',
          days: appendHistoryPage(current.days, page.days),
          nextBefore: page.next_before,
        },
        loadingMore: false,
      });
    } catch (error) {
      set({ loadingMore: false, loadMoreError: toApiError(error).message });
    }
  },
}));

let subscribed = false;

/**
 * Descarta el historial al cerrar sesion o cambiar de vendedor, con el mismo
 * flanco "no idle -> idle" del perfil que usa `initWeeklyRoute`. Idempotente.
 */
export function initRouteHistory(): void {
  if (subscribed) return;
  subscribed = true;

  useAuthStore.subscribe((state, previous) => {
    const justWentIdle = previous.profile.status !== 'idle' && state.profile.status === 'idle';
    if (justWentIdle) {
      useRouteHistoryStore.setState({
        history: { status: 'idle' },
        refreshing: false,
        loadingMore: false,
        loadMoreError: null,
      });
    }
  });
}
