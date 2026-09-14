import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { ApiError, apiFetch, type AuthenticatedUser } from '@/lib/api';
import { toSpanishAuthMessage } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

/** `loading` dura solo hasta que se rehidrata la sesion desde el almacenamiento. */
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type PasswordSetupState = 'idle' | 'required' | 'done';

/**
 * Quien es el usuario dentro del dominio del negocio. Se mantiene separado de
 * la sesion porque son dos preguntas distintas: "¿hay sesion?" se responde sin
 * red, "¿es un vendedor habilitado?" requiere llamar a la API.
 */
export type ProfileState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'ready'; me: AuthenticatedUser }
  | { status: 'error'; error: ApiError };

interface AuthStore {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileState;
  /**
   * Lo que esta sesion sabe de primera mano sobre la contraseña, por encima de
   * lo que diga el perfil:
   *
   *   idle     — nada que agregar; manda `passwordSetAt` del backend.
   *   required — entro por codigo, asi que hay que exigirle una contraseña
   *              aunque `passwordSetAt` ya tenga fecha (recuperacion).
   *   done     — acaba de guardarla con exito. Vale mas que un `passwordSetAt`
   *              todavia en null, que dejaria al usuario rebotando a esta misma
   *              pantalla despues de haberla completado.
   *
   * Vive en memoria a proposito: si mata la app a mitad, el dato persistente
   * del backend es el que manda.
   */
  passwordSetup: PasswordSetupState;
  /** Devuelve un mensaje en español si falló, o undefined si funcionó. */
  signIn: (email: string, password: string) => Promise<string | undefined>;
  requestOtp: (email: string) => Promise<string | undefined>;
  verifyOtp: (email: string, token: string, isReset: boolean) => Promise<string | undefined>;
  completePasswordSetup: (password: string) => Promise<string | undefined>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'loading',
  session: null,
  profile: { status: 'idle' },
  passwordSetup: 'idle',

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    // En caso de exito no se navega ni se asigna estado aqui: onAuthStateChange
    // es la unica fuente de verdad y los guards del router hacen el resto.
    return toSpanishAuthMessage(error);
  },

  async requestOtp(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Obligatorio: sin esto, cualquiera se da de alta con solo escribir un
      // correo. Las cuentas se crean unicamente desde el panel web.
      options: { shouldCreateUser: false },
    });

    return toSpanishAuthMessage(error);
  },

  async verifyOtp(email, token, isReset) {
    // Se marca ANTES de verificar, no despues: `verifyOtp` dispara el evento
    // SIGNED_IN por su propio camino asincrono, y si ese evento corriera despues
    // de un `set` posterior borraria la intencion y la recuperacion se saltaria
    // en silencio. Marcandola antes, el handler la encuentra ya puesta.
    //
    // Solo se exige contraseña cuando el vendedor venia a recuperarla. Marcarlo
    // en todo ingreso por codigo obligaba a cambiarla a quien ya tenia una y
    // solo queria entrar. El primer ingreso no necesita esta marca: ahi
    // `passwordSetAt` viene en null y el guard lo resuelve solo.
    if (isReset) set({ passwordSetup: 'required' });

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    });

    if (error) {
      if (isReset) set({ passwordSetup: 'idle' });
      return toSpanishAuthMessage(error);
    }

    return undefined;
  },

  async completePasswordSetup(password) {
    const { error } = await supabase.auth.updateUser({ password });

    // En un reintento tras un fallo de red al releer el perfil, `same_password`
    // significa que la contraseña si quedo puesta la vez anterior. Tratarlo como
    // error dejaria al usuario atrapado sin poder avanzar.
    if (error && error.code !== 'same_password') return toSpanishAuthMessage(error);

    // `app_user.password_set_at` lo estampa un trigger sobre `auth.users` en la
    // misma transaccion, asi que ya esta escrito. Solo queda releer el perfil.
    set({ passwordSetup: 'done' });
    await get().loadProfile();
    return undefined;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async loadProfile() {
    // Se le pide el token a supabase-js en lugar de usar el que trae el store:
    // getSession renueva el access token si ya vencio, cosa que pasa al abrir
    // la app despues de un rato en el fondo. Mandar el token cacheado haria que
    // la API respondiera 401 por un motivo que no es el del usuario.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (!token) return;

    set({ profile: { status: 'pending' } });

    try {
      const me = await apiFetch<AuthenticatedUser>('/api/v1/me', token);
      set({ profile: { status: 'ready', me } });
    } catch (error) {
      set({
        profile: {
          status: 'error',
          error:
            error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.'),
        },
      });
    }
  },
}));

let subscribed = false;

/**
 * Conecta el store a Supabase. Idempotente: el layout raiz la llama en un
 * efecto y Fast Refresh puede ejecutarlo mas de una vez.
 *
 * Al suscribirse, supabase-js emite `INITIAL_SESSION` en cuanto termina de leer
 * el almacenamiento, de modo que la rehidratacion y los cambios posteriores
 * (login, logout, refresh de token, refresh fallido) entran por el mismo
 * camino. Eso es lo que saca a `status` de `loading`.
 */
export function initAuth(): void {
  if (subscribed) return;
  subscribed = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    const previous = useAuthStore.getState();

    // Solo se descarta el estado local cuando deja de pertenecerle a alguien:
    // al cerrar sesion, o al entrar un vendedor distinto. Un refresh de token
    // conserva todo, y tambien lo hace el SIGNED_IN que sigue a verificar un
    // codigo — de otro modo ese evento borraria la intencion de recuperacion
    // que `verifyOtp` acaba de marcar.
    const switchedUser =
      session !== null &&
      previous.session !== null &&
      session.user.id !== previous.session.user.id;

    const discard = session === null || switchedUser;

    useAuthStore.setState({
      session,
      status: session ? 'signedIn' : 'signedOut',
      profile: discard ? { status: 'idle' } : previous.profile,
      passwordSetup: discard ? 'idle' : previous.passwordSetup,
    });
  });
}
