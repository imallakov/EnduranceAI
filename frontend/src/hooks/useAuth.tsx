import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getProfile } from '../api/auth';
import { refreshAccessToken } from '../api/client';
import type { UserProfile, LoginPayload, RegisterPayload } from '../types/api';

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserProfile>;
  register: (payload: RegisterPayload) => Promise<UserProfile>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: there's no access token in memory after a reload, so mint one
  // from the httpOnly refresh cookie, then load the profile. No valid cookie
  // (or it expired) → the refresh 401s and we stay logged out.
  useEffect(() => {
    refreshAccessToken()
      .then(() => getProfile())
      .then(setUser)
      .catch(() => {
        // Not authenticated — leave user null.
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<UserProfile> => {
    const profile = await apiLogin(payload);
    setUser(profile);
    return profile;
  }, []);

  const register = useCallback(async (payload: RegisterPayload): Promise<UserProfile> => {
    const profile = await apiRegister(payload);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      register,
      logout,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
