import { createContext } from 'react';
import type { AuthUser } from '@pmocore/shared';

export type AuthContextValue = {
  /** undefined while the session is being checked; null when signed out. */
  user: AuthUser | null | undefined;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;
