
'use client';

import React, { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { VenueList } from '@/components/settings/venue-list';
import { LogOut, Trash2, Download, Mail, Save, Loader2, Database, Cloud, FileSpreadsheet, RefreshCw, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useToast } from '@/hooks/use-toast';
import type { Settings } from '@/types';
import { useTranslation } from '@/hooks/use-translation';
import { sendReport } from '@/ai/flows/send-report-flow';
import { initAuth, googleSignIn, getAccessToken, logout } from '@/lib/auth';
import type { User } from 'firebase/auth';
import { createSpreadsheet, syncDataToSheet, fetchDataFromSheet } from '@/lib/sheets';
import { useEvents } from '@/hooks/use-events-store';
import { useVenues } from '@/hooks/use-venues-store';

export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const { events } = useEvents();
  const { venues } = useVenues();
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [inputSpreadsheetId, setInputSpreadsheetId] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (u, t) => {
        setUser(u);
        setToken(t);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
      toast({
        title: 'Login failed',
        description: 'Failed to authenticate with Google',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const ensureToken = async (): Promise<string | null> => {
    let currentToken = token;
    if (!currentToken) {
      currentToken = await getAccessToken();
    }
    if (!currentToken) {
      setIsLoggingIn(true);
      try {
        const result = await googleSignIn();
        if (result) {
          setToken(result.accessToken);
          setUser(result.user);
          setNeedsAuth(false);
          return result.accessToken;
        }
      } catch (err) {
        console.error('Auto login / Token retrieval failed:', err);
      } finally {
        setIsLoggingIn(false);
      }
      return null;
    }
    return currentToken;
  };

  const handleDriveBackup = async () => {
    const activeToken = await ensureToken();
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }

    setIsBackingUp(true);
    try {
      const res = await fetch('/api/backup/drive', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        toast({
          title: 'Backup Successful',
          description: 'Your database has been backed up to Google Drive.',
        });
      } else {
        throw new Error('Backup failed');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast({
        title: 'Backup Failed',
        description: 'There was an error backing up to Google Drive.',
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    const isEs = localSettings.language === 'es';
    const activeToken = await ensureToken();
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }
    setIsCreatingSheet(true);
    try {
      const sheetId = await createSpreadsheet(activeToken);
      
      const updated = {
        ...localSettings,
        spreadsheetId: sheetId,
        sheetsSyncEnabled: true,
      };
      setLocalSettings(updated);
      setSettings(updated);

      toast({
        title: isEs ? 'Spreadsheet Creado' : 'Spreadsheet Created',
        description: isEs 
          ? 'Se ha creado el archivo en Google Sheets. Iniciando sincronización de datos...' 
          : 'Google Spreadsheet created. Starting data sync...',
      });

      await syncDataToSheet(activeToken, sheetId, events, venues);

      toast({
        title: isEs ? 'Sincronización Exitosa' : 'Sync Successful',
        description: isEs 
          ? 'Todos tus eventos y locales han sido guardados en Google Sheets.' 
          : 'All events and venues have been stored in Google Sheets.',
      });
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      toast({
        title: isEs ? 'Error al crear' : 'Failed to create',
        description: isEs 
          ? 'Hubo un problema al crear el archivo en Google Sheets.' 
          : 'There was an error creating the Google Sheet.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleManualSync = async () => {
    const isEs = localSettings.language === 'es';
    const activeToken = await ensureToken();
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }
    const sheetId = localSettings.spreadsheetId;
    if (!sheetId) return;

    setIsSyncing(true);
    try {
      await syncDataToSheet(activeToken, sheetId, events, venues);
      toast({
        title: isEs ? 'Sincronización Exitosa' : 'Sync Successful',
        description: isEs 
          ? 'Tus datos se actualizaron correctamente en Google Sheets.' 
          : 'Your data has been successfully updated in Google Sheets.',
      });
    } catch (error) {
      console.error('Error syncing to spreadsheet:', error);
      toast({
        title: isEs ? 'Error de Sincronización' : 'Sync Failed',
        description: isEs 
          ? 'Hubo un error al actualizar el archivo en Google Sheets.' 
          : 'There was an error updating your Google Sheets database.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromSheets = async () => {
    const isEs = localSettings.language === 'es';
    const activeToken = await ensureToken();
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }
    const sheetId = localSettings.spreadsheetId;
    if (!sheetId) return;

    setIsRestoring(true);
    try {
      const data = await fetchDataFromSheet(activeToken, sheetId);
      if (!data) {
        throw new Error('No data found or failed to fetch');
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: data.events.map(e => ({ ...e, date: e.date.toISOString() })),
          venues: data.venues
        })
      });

      if (response.ok) {
        toast({
          title: isEs ? 'Restauración Exitosa' : 'Restore Successful',
          description: isEs 
            ? `Se han recuperado ${data.events.length} eventos y ${data.venues.length} locales desde Google Sheets.` 
            : `Successfully restored ${data.events.length} events and ${data.venues.length} venues from Google Sheets.`,
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error('Failed to overwrite local database');
      }
    } catch (error) {
      console.error('Error restoring from spreadsheet:', error);
      toast({
        title: isEs ? 'Error de Restauración' : 'Restore Failed',
        description: isEs 
          ? 'No se pudieron recuperar los datos de Google Sheets. Asegúrate de que el archivo tenga el formato correcto.' 
          : 'Failed to restore data from Google Sheets. Make sure the spreadsheet has the correct format.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleLinkSpreadsheet = () => {
    const isEs = localSettings.language === 'es';
    if (!inputSpreadsheetId.trim()) return;
    const updated = {
      ...localSettings,
      spreadsheetId: inputSpreadsheetId.trim(),
      sheetsSyncEnabled: true,
    };
    setLocalSettings(updated);
    setSettings(updated);
    
    toast({
      title: isEs ? 'Enlace Exitoso' : 'Linked Successfully',
      description: isEs 
        ? 'Se vinculó el ID de Google Sheets. Ahora puedes sincronizar tus datos.' 
        : 'Google Sheets ID linked. You can now sync your data.',
    });
  };

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = () => {
    const updatedSettings = { ...localSettings, exportMethod: 'download' as const };
    setSettings(updatedSettings);
    toast({
      title: t('settings.toast.save.title'),
      description: t('settings.toast.save.description'),
    });
  };

  const handleSendTestEmail = async () => {
    if (!localSettings.reportEmail) {
        toast({
            title: t('sendReportDialog.toast.error.title'),
            description: t('settings.toast.reportEmail.required'),
            variant: 'destructive',
        });
        return;
    }
    setIsSendingTest(true);
    try {
      await sendReport({
        email: localSettings.reportEmail,
        report: {
          title: 'Test Report from DJ Ledger',
          events: [],
        },
      });
      toast({
        title: t('sendReportDialog.toast.success.title'),
        description: t('sendReportDialog.toast.success.description', { email: localSettings.reportEmail }),
      });
    } catch (error) {
      console.error('Failed to send test report:', error);
      toast({
        title: t('sendReportDialog.toast.error.title'),
        description: t('sendReportDialog.toast.error.description'),
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h2>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general.title')}</CardTitle>
              <CardDescription>{t('settings.general.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="language">{t('settings.general.language.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.general.language.description')}
                  </p>
                </div>
                <Select 
                  value={localSettings.language}
                  onValueChange={(value: 'en' | 'es') => handleSettingChange('language', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="theme">{t('settings.general.theme.label')}</Label>
                   <p className="text-sm text-muted-foreground">
                    {t('settings.general.theme.description')}
                  </p>
                </div>
                 <div className="flex items-center space-x-4">
                    <Select 
                       value={localSettings.theme}
                       onValueChange={(value: 'light' | 'dark' | 'system') => handleSettingChange('theme', value)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Theme" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="light">{t('settings.general.theme.light')}</SelectItem>
                            <SelectItem value="dark">{t('settings.general.theme.dark')}</SelectItem>
                            <SelectItem value="system">{t('settings.general.theme.system')}</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.user.title')}</CardTitle>
              <CardDescription>{t('settings.user.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                 <div className="space-y-1">
                    <Label htmlFor="username">{t('settings.user.username.label')}</Label>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.user.username.description')}
                    </p>
                 </div>
                  <Input 
                    id="username" 
                    placeholder="DJ Cool" 
                    className="w-[380px]"
                    value={localSettings.username}
                    onChange={(e) => handleSettingChange('username', e.target.value)}
                  />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.user.notifications.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.user.notifications.description')}
                  </p>
                </div>
                <Switch 
                   checked={localSettings.notifications}
                   onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
                />
              </div>

               <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reminder-time">{t('settings.user.reminder.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.user.reminder.description')}
                  </p>
                </div>
                <Select
                  value={localSettings.reminderTime}
                  onValueChange={(value: '15' | '60' | '1440') => handleSettingChange('reminderTime', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t('settings.user.reminder.minutes', { count: 15 })}</SelectItem>
                    <SelectItem value="60">{t('settings.user.reminder.hour', { count: 1 })}</SelectItem>
                    <SelectItem value="1440">{t('settings.user.reminder.day', { count: 1 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.venues.title')}</CardTitle>
              <CardDescription>{t('settings.venues.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <VenueList />
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>{t('settings.export.title')}</CardTitle>
              <CardDescription>{t('settings.export.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.export.frequency.label')}</Label>
                   <p className="text-sm text-muted-foreground">
                    {t('settings.export.frequency.description')}
                  </p>
                </div>
                <Select
                  value={localSettings.exportFrequency}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'annually') => handleSettingChange('exportFrequency', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('settings.export.frequency.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('settings.export.frequency.weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('settings.export.frequency.monthly')}</SelectItem>
                    <SelectItem value="annually">{t('settings.export.frequency.annually')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                    <Label>{t('settings.export.method.label')}</Label>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.export.method.description')}
                    </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button 
                            variant="default"
                            className="w-[120px]"
                            onClick={() => handleSettingChange('exportMethod', 'download')}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            {t('settings.export.method.download')}
                        </Button>
                    </div>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Google Drive Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Save your SQLite database to your Google Drive.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {needsAuth || !user ? (
                    <Button variant="outline" onClick={handleLogin} disabled={isLoggingIn}>
                       {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
                       Sign in with Google
                    </Button>
                  ) : (
                    <Button variant="default" onClick={handleDriveBackup} disabled={isBackingUp}>
                       {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4" />}
                       Backup to Drive
                    </Button>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.export.session.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.export.session.description')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" onClick={() => logout()}>
                        <LogOut className="mr-2" />
                        {t('settings.export.session.logout')}
                    </Button>
                    <Button variant="destructive">
                        <Trash2 className="mr-2" />
                        {t('settings.export.session.delete')}
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                {localSettings.language === 'es' ? 'Sincronización con Google Sheets' : 'Google Sheets Synchronization'}
              </CardTitle>
              <CardDescription>
                {localSettings.language === 'es' 
                  ? 'Guarda tus datos en una hoja de cálculo en tiempo real para usarla como una base de datos externa.' 
                  : 'Save your data in a spreadsheet in real-time to use it as an external database.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user && !needsAuth ? (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="Google Avatar" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                        {user.displayName ? user.displayName[0] : 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.displayName || 'Google User'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    {localSettings.language === 'es' ? 'Conectado' : 'Connected'}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg gap-4 text-sm">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="font-semibold text-amber-800 dark:text-amber-400">
                      {localSettings.language === 'es' ? 'Sincronización Activa (Google Desconectado)' : 'Active Sync (Google Offline)'}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      {localSettings.language === 'es' 
                        ? 'Tu base de datos está vinculada. Inicia sesión con Google para permitir sincronización y respaldos automáticos en tiempo real.'
                        : 'Your database remains linked. Please sign in with Google to enable real-time updates and automated backups.'}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogin} disabled={isLoggingIn} className="border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {isLoggingIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cloud className="mr-2 h-4 w-4 text-amber-500" />}
                    {localSettings.language === 'es' ? 'Vincular Cuenta' : 'Link Account'}
                  </Button>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sheets-sync">{localSettings.language === 'es' ? 'Sincronización Automática' : 'Automatic Synchronization'}</Label>
                    <p className="text-sm text-muted-foreground">
                      {localSettings.language === 'es' 
                        ? 'Sincroniza automáticamente los cambios al agregar, editar o eliminar eventos.' 
                        : 'Automatically sync changes when adding, editing, or deleting events.'}
                    </p>
                  </div>
                  <Switch 
                    id="sheets-sync"
                    checked={!!localSettings.sheetsSyncEnabled}
                    onCheckedChange={(checked) => handleSettingChange('sheetsSyncEnabled', checked)}
                    disabled={!localSettings.spreadsheetId}
                  />
                </div>

                <Separator />

                {localSettings.spreadsheetId ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{localSettings.language === 'es' ? 'ID del Spreadsheet de Google Sheets' : 'Google Sheets Spreadsheet ID'}</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={localSettings.spreadsheetId} 
                          readOnly 
                          className="font-mono text-xs bg-muted/30"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          asChild
                        >
                          <a 
                            href={`https://docs.google.com/spreadsheets/d/${localSettings.spreadsheetId}/edit`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title={localSettings.language === 'es' ? 'Abrir en Google Sheets' : 'Open in Google Sheets'}
                          >
                            <ExternalLink className="h-4 w-4 text-green-500" />
                          </a>
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white" 
                        onClick={handleManualSync} 
                        disabled={isSyncing}
                      >
                        {isSyncing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {localSettings.language === 'es' ? 'Sincronizar Datos Ahora' : 'Sync Data Now'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          handleSettingChange('spreadsheetId', '');
                          handleSettingChange('sheetsSyncEnabled', false);
                        }}
                      >
                        {localSettings.language === 'es' ? 'Desvincular' : 'Unlink'}
                      </Button>
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="outline"
                        className="w-full border-green-500/30 hover:bg-green-500/10 text-green-600 dark:text-green-400"
                        onClick={handleRestoreFromSheets}
                        disabled={isRestoring}
                      >
                        {isRestoring ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        {localSettings.language === 'es' 
                          ? 'Restaurar / Importar Datos desde Google Sheets' 
                          : 'Restore / Import Data from Google Sheets'}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        {localSettings.language === 'es'
                          ? 'Recupera tus eventos y locales guardados en Google Sheets en caso de que se hayan borrado.'
                          : 'Recover your saved events and venues from Google Sheets in case they were cleared.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {localSettings.language === 'es' ? 'Crear un nuevo archivo de base de datos' : 'Create a new database spreadsheet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {localSettings.language === 'es' 
                          ? 'Esto creará un nuevo archivo llamado "DJ Ledger - Base de Datos" en tu Google Drive y cargará toda la información de eventos y locales actual.'
                          : 'This will create a new spreadsheet named "DJ Ledger - Base de Datos" in your Google Drive and upload all current events and venues.'}
                      </p>
                      <Button 
                        onClick={handleCreateSpreadsheet} 
                        disabled={isCreatingSheet}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isCreatingSheet ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                        )}
                        {localSettings.language === 'es' ? 'Crear Base de Datos en Sheets' : 'Create Database in Sheets'}
                      </Button>
                    </div>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          {localSettings.language === 'es' ? 'O vincula un archivo existente' : 'Or link an existing sheet'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="existing-sheet-id">
                        {localSettings.language === 'es' ? 'ID del Spreadsheet existente' : 'Existing Spreadsheet ID'}
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          id="existing-sheet-id"
                          placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                          value={inputSpreadsheetId}
                          onChange={(e) => setInputSpreadsheetId(e.target.value)}
                        />
                        <Button 
                          variant="secondary" 
                          onClick={handleLinkSpreadsheet}
                          disabled={!inputSpreadsheetId.trim()}
                        >
                          <LinkIcon className="mr-2 h-4 w-4" />
                          {localSettings.language === 'es' ? 'Vincular' : 'Link'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardFooter className="justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2" />
                  {t('settings.save')}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
