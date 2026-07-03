
'use client';

import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { DiscAlbum, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/hooks/use-auth-store';
import { getAccessToken } from '@/lib/auth';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { fetchDataFromSheet } from '@/lib/sheets';
import { useToast } from '@/hooks/use-toast';

export function AppLayout() {
  const { logout } = useAuthStore();
  const { settings, isInitialized: settingsInitialized } = useSettingsStore();
  const { toast } = useToast();
  const autoRestoreAttempted = useRef(false);

  useEffect(() => {
    if (!settingsInitialized || autoRestoreAttempted.current) return;
    if (!settings.spreadsheetId) return;

    async function checkAndAutoRestore() {
      try {
        // 1. Check if local database is empty
        const [eventsRes, venuesRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/venues')
        ]);

        if (!eventsRes.ok || !venuesRes.ok) return;

        const events = await eventsRes.json();
        const venues = await venuesRes.json();

        // If BOTH are completely empty, we restore from Google Sheets
        if (events.length === 0 && venues.length === 0) {
          console.log("Local database is empty. Attempting auto-restore from linked Google Sheet...");
          
          const token = await getAccessToken();
          if (!token) {
            console.log("No Google Auth token available for auto-restore.");
            return;
          }

          autoRestoreAttempted.current = true;

          const data = await fetchDataFromSheet(token, settings.spreadsheetId!);
          if (data && (data.events.length > 0 || data.venues.length > 0)) {
            // Overwrite server database
            const response = await fetch('/api/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                events: data.events.map(e => ({ ...e, date: e.date.toISOString() })),
                venues: data.venues
              })
            });

            if (response.ok) {
              console.log("Auto-restore successful!");
              toast({
                title: settings.language === 'es' ? 'Datos Recuperados' : 'Data Recovered',
                description: settings.language === 'es' 
                  ? `Se restauraron automáticamente ${data.events.length} eventos y ${data.venues.length} locales desde Google Sheets.`
                  : `Successfully auto-restored ${data.events.length} events and ${data.venues.length} venues from Google Sheets.`,
              });
              // Reload page to update UI stores
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
          }
        } else {
          autoRestoreAttempted.current = true;
        }
      } catch (err) {
        console.error("Auto-restore check failed:", err);
      }
    }

    checkAndAutoRestore();
  }, [settings, settingsInitialized, toast]);
  
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar className="border-r">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <DiscAlbum className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-bold">DJ Ledger</h1>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarNav />
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 items-center justify-start gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
                <SidebarTrigger asChild>
                    <Button size="icon" variant="outline" className="md:hidden">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                        >
                            <line x1="4" x2="20" y1="6" y2="6" />
                            <line x1="4" x2="20" y1="12" y2="12" />
                            <line x1="4" x2="20" y1="18" y2="18" />
                        </svg>
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                </SidebarTrigger>
                 <div className="flex items-center gap-2">
                    <DiscAlbum className="w-6 h-6 text-primary" />
                    <h1 className="text-lg font-bold">DJ Ledger</h1>
                </div>
            </header>
            <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
