
'use client';

import React from 'react';
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
import { DiscAlbum } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppLayout({ children }: { children: React.ReactNode }) {
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
          <SidebarFooter>
            {/* Can add user profile or settings here */}
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
            {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
