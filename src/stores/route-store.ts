import { AppState } from 'react-native';
import { create } from 'zustand';

import { ApiError } from '@/lib/api';
import { fetchDailyRoute, type DailyRoute } from '@/lib/daily-route';
import { isSessionUnauthorized } from '@/lib/request-config';
import { shouldReloadOnResume } from '@/lib/route-refresh';
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
  /**
   * `Date.now()` de la ultima carga exitosa, o null si no hay ninguna. Solo
   * lo usa la recarga al volver al frente (ver `initRoute`). Un refresh
   * fallido no lo toca, asi el siguiente regreso al frente lo reintenta.
   */
  loadedAt: number | null;
  /** Devuelve un mensaje en español si falló, o undefined si funcionó. */
  loadRoute: (date?: string) => Promise<string | undefined>;
}

export const useRouteStore = create<RouteStore>((set, get) => ({
  route: { status: 'idle' },
  refreshing: false,
  loadedAt: null,

  async loadRoute(date) {
    const alreadyLoaded = get().route.status === 'ready';
    if (alreadyLoaded) {
      set({ refreshing: true });
    } else {
      set({ route: { status: 'pending' } });
    }

    try {
      const route = await fetchDailyRoute(date);
      set({ route: { status: 'ready', route }, refreshing: false, loadedAt: Date.now() });
      return undefined;
    } catch (error) {
      const apiError =
        error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.');

      // La sesion ya se cerro en apiFetch. No dejar la ruta del vendedor en
      // pantalla ni un error de "reintentar" cuando el destino es el login.
      if (isSessionUnauthorized(apiError.status, apiError.message)) {
        set({ refreshing: false });
        return apiError.message;
      }

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
      useRouteStore.setState({ route: { status: 'idle' }, refreshing: false, loadedAt: null });
    }
  });

  // La pantalla principal solo pide la ruta en `idle`, y el store vive en
  // memoria: si la app queda en segundo plano al cruzar la medianoche, al
  // volver seguiria mostrando las paradas de ayer (PCRM-195). Volver al frente
  // es la senal para revisar. No se usa un setInterval ni un timer apuntado a
  // la medianoche porque con la app en segundo plano Android los congela
  // (doze) y no dispararian a tiempo; el resume siempre llega.
  AppState.addEventListener('change', (appState) => {
    if (appState !== 'active') return;
    const { route, refreshing, loadedAt, loadRoute } = useRouteStore.getState();
    // Solo sobre una ruta ya en pantalla: la primera carga y sus errores los
    // maneja la pantalla principal. Si ya hay un refresh en vuelo, no se pisa.
    if (route.status !== 'ready' || refreshing) return;
    if (!shouldReloadOnResume(loadedAt, Date.now())) return;
    // Sin fecha a proposito: el backend resuelve "hoy" en America/El_Salvador
    // y el `date` de la respuesta reemplaza el del store, asi el cruce de
    // medianoche se corrige solo. Mandar la ruta cargada (`route.route.date`)
    // volveria a pedir el dia viejo, y calcular la fecha en el telefono
    // dependeria de su reloj y su zona horaria. Como la ruta ya esta `ready`,
    // loadRoute usa `refreshing` y no desmonta el mapa ni la lista.
    void loadRoute();
  });
}
