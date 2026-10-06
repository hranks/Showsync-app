import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/use-auth-store';
import { LoginScreen } from '@/components/auth/login-screen';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { SettingsProvider } from '@/hooks/use-settings-store';

// Pages
import DashboardPage from '@/pages/Dashboard';
import EventsPage from '@/pages/Events';
import EarningsPage from '@/pages/Earnings';
import ReportsPage from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';

function SessionTimeoutManager() {
  const { isAuthenticated, logout } = useAuthStore();
  const { toast } = useToast();
  const timeoutRef = useRef<any>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos de inactividad

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      if (elapsed >= TIMEOUT_MS) {
        logout();
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha cerrado automáticamente por inactividad de 5 minutos.",
          variant: "destructive"
        });
      } else {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(checkInactivity, Math.max(1000, TIMEOUT_MS - elapsed));
      }
    };

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(checkInactivity, TIMEOUT_MS);
    };

    // Initialize timer on load
    recordActivity();

    // Comprobar inactividad al volver del segundo plano / desbloquear el móvil
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    // Setup event listeners for user activity (incluyendo gestos táctiles móviles)
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'touchmove',
      'pointerdown',
      'click'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, recordActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, recordActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isAuthenticated, logout, toast]);

  return null;
}

export default function App() {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Cargando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider>
      <BrowserRouter>
        <SessionTimeoutManager />
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginScreen /> : <Navigate to="/" replace />} 
          />
          <Route
            path="/"
            element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
          >
            <Route index element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </SettingsProvider>
  );
}
