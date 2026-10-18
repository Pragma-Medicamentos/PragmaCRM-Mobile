import { create } from 'zustand';

import { ApiError } from '@/lib/api';
import { isSessionUnauthorized } from '@/lib/request-config';
import { fetchWeeklyRoute, type WeeklyRoute } from '@/lib/weekly-route';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Estado de la semana asignada (PCRM-170). Mismo contrato que `route-store`:
 * `pending` es solo la primera carga y un refresh usa `refreshing`, asi la
 * lista y el mapa de la vista previa no se desmontan con cada refresco.
 */
export type WeekState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; week: WeeklyRoute }
  | { status: 'error'; error: ApiError };

interface WeeklyRouteStore {
  week: WeekState;
  refreshing: boolean;
  /** Devuelve un mensaje en español si falló, o undefined si funcionó. */
  loadWeek: () => Promise<string | undefined>;
}

export const useWeeklyRouteStore = create<WeeklyRouteStore>((set, get) => ({
  week: { status: 'idle' },
  refreshing: false,

  async loadWeek() {
    const alreadyLoaded = get().week.status === 'ready';
    if (alreadyLoaded) {
      set({ refreshing: true });
    } else {
      set({ week: { status: 'pending' } });
    }

    try {
      const week = await fetchWeeklyRoute();
      set({ week: { status: 'ready', week }, refreshing: false });
      return undefined;
    } catch (error) {
      const apiError =
        error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.');

      // La sesion ya se cerro en apiFetch: el destino es el login.
      if (isSessionUnauthorized(apiError.status, apiError.message)) {
        set({ refreshing: false });
        return apiError.message;
      }

      // Igual que route-store (R10): un refresh fallido no tira la semana que
      // ya estaba en pantalla.
      set({
        week: alreadyLoaded ? get().week : { status: 'error', error: apiError },
        refreshing: false,
      });
      return apiError.message;
    }
  },
}));

let subscribed = false;

/**
 * Descarta la semana al cerrar sesion o cambiar de vendedor, con el mismo
 * flanco "no idle -> idle" del perfil que usa `initRoute` (ver el comentario
 * largo de route-store.ts). Idempotente.
 */
export function initWeeklyRoute(): void {
  if (subscribed) return;
  subscribed = true;

  useAuthStore.subscribe((state, previous) => {
    const justWentIdle = previous.profile.status !== 'idle' && state.profile.status === 'idle';
    if (justWentIdle) {
      useWeeklyRouteStore.setState({ week: { status: 'idle' }, refreshing: false });
    }
  });
}
