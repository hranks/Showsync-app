
'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { useSettingsStore } from '@/hooks/use-settings-store';
import { AuthGuard } from '@/components/auth/auth-guard';
import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings, isInitialized } = useSettingsStore();

  React.useEffect(() => {
    if (isInitialized) {
      let currentTheme = settings.theme;
      // This check should only run on the client
      if (typeof window !== 'undefined' && currentTheme === 'system') {
        currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.className = currentTheme;
      document.documentElement.lang = settings.language;
    }
  }, [settings.theme, settings.language, isInitialized]);

  // Render a consistent skeleton on both server and client during the initial render.
  // The useEffect will then apply the correct theme and language on the client.
  return (
    <html lang={settings.language || 'en'} className={settings.theme || 'dark'} suppressHydrationWarning>
      <head>
        <title>DJ Ledger</title>
        <meta name="description" content="Track your DJ gigs, earnings, and hours." />
        <meta name="application-name" content="DJ Ledger" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="DJ Ledger" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#a855f7" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#a855f7" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster />
      </body>
    </html>
  );
}
