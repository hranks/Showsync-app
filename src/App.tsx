import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/hooks/use-auth-store';
import { LoginScreen } from '@/components/auth/login-screen';
import { AppLayout } from '@/components/layout/app-layout';

// Pages
import DashboardPage from '@/pages/Dashboard';
import EventsPage from '@/pages/Events';
import EarningsPage from '@/pages/Earnings';
import ReportsPage from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
