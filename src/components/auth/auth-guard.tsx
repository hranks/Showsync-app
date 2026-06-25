'use client';

import React from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { LoginScreen } from './login-screen';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isInitialized, isAuthenticated } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
