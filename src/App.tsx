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

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // 5 minutes of inactivity: 5 * 60 * 1000 = 300,000 ms
      timeoutRef.current = setTimeout(() => {
        logout();
        toast({
          title: "Sesión expirada",
          description: "Tu sesión ha cerrado automáticamente por inactividad de 5 minutos.",
          variant: "destructive"
        });
      }, 5 * 60 * 1000);
    };

    // Initialize timer on load
    resetTimer();

    // Setup event listeners for user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated, logout, toast]);

  return null;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

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
