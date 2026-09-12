import { useAuth } from '@clerk/expo';
import { useEffect, useState } from 'react';

import { ApiError, apiFetch, type AuthenticatedUser } from '@/lib/api';

export type MeState =
  | { status: 'pending' }
  | { status: 'ready'; me: AuthenticatedUser }
  | { status: 'error'; error: ApiError };

/**
 * Resolves who the signed-in Clerk user is inside the business domain.
 *
 * The API separates "your session died" (401) from "your account isn't
 * authorized" (403), and only the first one is fixable by signing in again —
 * so the ApiError status is preserved rather than collapsed into a boolean.
 */
export function useMe(): MeState {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [state, setState] = useState<MeState>({ status: 'pending' });

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    void (async () => {
      try {
        const token = await getToken();
        const me = await apiFetch<AuthenticatedUser>('/api/v1/me', token);
        if (!cancelled) setState({ status: 'ready', me });
      } catch (error) {
        if (cancelled) return;
        setState({
          status: 'error',
          error:
            error instanceof ApiError ? error : new ApiError(0, 'Ocurrió un error inesperado.'),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  return state;
}
