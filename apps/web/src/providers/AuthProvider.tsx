import { useCallback, useEffect, useMemo, type PropsWithChildren } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@pmocore/shared';
import { ApiClientError, apiClient, onUnauthorized } from '@/lib/api-client';
import { AUTH_QUERY_KEY, AuthContext, type AuthContextValue } from './auth-context';

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await apiClient.get<{ user: AuthUser }>('/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

/** Server-side session state for the UI. Route guarding here is UX only; the API enforces access. */
export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  const signedOut = useCallback(() => {
    queryClient.clear();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
  }, [queryClient]);

  useEffect(() => {
    onUnauthorized(signedOut);
    return () => onUnauthorized(undefined);
  }, [signedOut]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await apiClient.post<{ user: AuthUser }>('/auth/login', { email, password });
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, result.user);
      return result.user;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      signedOut();
    }
  }, [signedOut]);

  const value = useMemo<AuthContextValue>(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
