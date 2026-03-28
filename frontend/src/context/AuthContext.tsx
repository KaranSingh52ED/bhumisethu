/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { completeRegistrationProfile, googleLogin, getCurrentUser } from '../lib/authApi';
import type { AuthUser, RegistrationProfilePayload } from '../types/auth';

const TOKEN_KEY = 'bhoomi_auth_token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  loginWithGoogle: (idToken: string) => Promise<void>;
  completeRegistration: (payload: RegistrationProfilePayload) => Promise<void>;
  /** Reload profile from the server (e.g. after admin approval). */
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);
        setUser(currentUser);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [token]);

  const loginWithGoogle = async (idToken: string) => {
    const data = await googleLogin(idToken);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const completeRegistration = useCallback(
    async (payload: RegistrationProfilePayload) => {
      if (!token) {
        throw new Error('You must be signed in.');
      }
      const data = await completeRegistrationProfile(token, payload);
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
    },
    [token],
  );

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const u = await getCurrentUser(token);
      setUser(u);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      loginWithGoogle,
      completeRegistration,
      refreshUser,
      logout,
    }),
    [user, token, isLoading, completeRegistration, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
};
