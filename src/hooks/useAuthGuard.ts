'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { UserRole } from '@/lib/auth-context';

const ROLE_HOME: Record<UserRole, string> = {
  CLIENT: '/client/dashboard',
  DRIVER: '/driver/dashboard',
  ADMIN: '/admin/dashboard',
};

export function useAuthGuard(requiredRole: UserRole) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.role !== requiredRole && user.role !== 'ADMIN') {
      router.replace(ROLE_HOME[user.role]);
      return;
    }

    if (requiredRole === 'DRIVER' && user.role === 'DRIVER') {
      if (user.driverProfile?.status !== 'APPROVED') {
        router.replace('/driver/onboarding');
      }
    }
  }, [user, loading, router, requiredRole]);

  return { user, loading };
}
