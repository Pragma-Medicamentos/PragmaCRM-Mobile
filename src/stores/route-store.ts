import { create } from 'zustand';

import { ApiError } from '@/lib/api';
import { fetchDailyRoute, type DailyRoute } from '@/lib/daily-route';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Estado de la ruta diaria en el servidor. `pending` significa solo "primera
 * carga": un refresh (pull-to-refresh) sobre una ruta ya cargada no vuelve a
 * `pending`, usa el flag `refreshing` de RouteStore. Sin esa separacion, cada
 * refresh desmontaria el mapa y la lista para volver a montarlos.
 */
export type RouteState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; route: DailyRoute }
  | { status: 'error'; error: ApiError };

interface RouteStore {
  route: RouteState;
  /** Aparte del union de arriba a proposito: ver el comentario de RouteState. */
  refreshing: boolean;
  /** Devuelve un mensaje en español si falló, o undefined si funcionó. */
  loadRoute: (date?: string) => Promise<string | undefined>;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  route: { status: 'idle' },
  refreshing: false,

  async loadRoute(date) {
    // Se le pide el token a supabase-js en lugar de usar el que trae
    // auth-store: getSession renueva el access token si ya vencio, cosa que
    // pasa al abrir la app despues de un rato en el fondo. Mandar el token
    // cacheado haria que la API respondiera 401 por un motivo que no es el
    // del usuario.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (!token) return undefined;

    const alreadyLoaded = get().route.status === 'ready';
    if (alreadyLoaded) {
      set({ refreshing: true });
    } else {
      set({ route: { status: 'pending' } });
    }

    try {
      const route = await fetchDailyRoute(token, date);
      set({ route: { status: 'ready', route }, refreshing: false });
      return undefined;
    } catch (error) {
      const apiError =
        error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.');

      // R10: un refresh fallido sobre datos que ya estaban en pantalla no los
      // tira -- si no, un tropiezo de red transitorio durante un
      // pull-to-refresh desmontaria el mapa, exactamente lo que el flag
      // `refreshing` existe para evitar, solo que llegando por el camino del
      // error en lugar del de `pending`. `status: 'error'` queda reservado
      // para cuando la primera carga falla y no hay nada que conservar.
      set({
        route: alreadyLoaded ? get().route : { status: 'error', error: apiError },
        refreshing: false,
      });
      return apiError.message;
    }
  },
}));

let subscribed = false;

/**
 * Conecta route-store a auth-store. Idempotente: el layout raiz la llama en
 * un efecto y Fast Refresh puede ejecutarla mas de una vez.
 *
 * No recalcula el cierre de sesion ni el cambio de vendedor: `initAuth` ya
 * escucha `onAuthStateChange`, ya compara `session.user.id` contra el
 * anterior, y cuando decide descartar el perfil pone `profile: { status:
 * 'idle' }`. Esta suscripcion solo observa esa decision ya tomada -- si no,
 * quedan en pantalla las paradas del vendedor anterior tras un cambio de
 * cuenta. La direccion de dependencia es route-store -> auth-store, nunca al
 * reves.
 */
export function initRoute(): void {
  if (subscribed) return;
  subscribed = true;

  useAuthStore.subscribe((state, previous) => {
    // Se compara contra el estado anterior porque `profile` tambien vale
    // `idle` en frio (arranque de la app) y durante todo el tramo entre el
    // SIGNED_IN y que `loadProfile()` resuelve. Una comparacion por nivel
    // ("si status === 'idle'") dispararia el reset con cada emision de
    // auth-store que encuentre `profile` todavia en `idle` -- incluida la
    // que sigue a un login exitoso -- y borraria una ruta recien cargada o en
    // vuelo. Solo el flanco (paso de "no idle" a "idle") es la senal real de
    // sign-out o cambio de vendedor que initAuth ya calculo.
    const justWentIdle = previous.profile.status !== 'idle' && state.profile.status === 'idle';
    if (justWentIdle) {
      useRouteStore.setState({ route: { status: 'idle' }, refreshing: false });
    }
  });
}
