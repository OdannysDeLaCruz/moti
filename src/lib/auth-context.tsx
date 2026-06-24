'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setAccessToken } from './api-client';

export type UserRole = 'CLIENT' | 'DRIVER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  verifiedAt?: string | null;
  createdAt?: string;
  driverProfile?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    freeRidesUsed: number;
    passExpiresAt: string | null;
    vehiclePlate: string;
    vehicleModel: string;
    createdAt: string;
    profilePhotoUrl: string;
  } | null;
  passActive?: boolean;
  maxFreeRides?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    // email: string;
    password: string;
    fullName: string;
    phone: string;
    role: UserRole;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<AuthUser>('/api/users/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (phone: string, password: string) => {
    // Eliminar + del número de teléfono
    const phoneWithoutCountryCode = phone.replace('+', '');
    console.log(phoneWithoutCountryCode);
    const { data } = await api.post<{ user: AuthUser; accessToken: string }>('/auth/login', {
      phone: phoneWithoutCountryCode,
      password,
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (form: {
      // email: string;
      phone: string;
      password: string;
      fullName: string;
      role: UserRole
    }) => {
      // Eliminar + del número de teléfono
      const { phone, ...rest } = form;
      const phoneWithoutCountryCode = phone.replace('+', '');
      console.log(phoneWithoutCountryCode);
      const { data } = await api.post<{ user: AuthUser; accessToken: string }>('/auth/register', 
        {
          ...rest,
          phone: phoneWithoutCountryCode
        });
      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
