
'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { VenueList } from '@/components/settings/venue-list';
import { LogOut, Trash2, Download, Mail, Save, Loader2, Database } from 'lucide-react';
import { useSettingsStore } from '@/hooks/use-settings-store';
import { useToast } from '@/hooks/use-toast';
import type { Settings } from '@/types';
import { useTranslation } from '@/hooks/use-translation';
import { sendReport } from '@/ai/flows/send-report-flow';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';


export default function SettingsPage() {
  const { settings, setSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = React.useState<Settings>(settings);
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [isTestingFirestore, setIsTestingFirestore] = React.useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();


  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = () => {
    setSettings(localSettings);
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

  const handleTestFirestore = async () => {
    setIsTestingFirestore(true);
    try {
        const testDocRef = doc(db, "users/default-user/test/connection-test");
        await setDoc(testDocRef, {
            timestamp: new Date(),
            status: 'ok',
        });
        toast({
            title: t('settings.toast.firestore.success.title'),
            description: t('settings.toast.firestore.success.description'),
        });
    } catch (error) {
        console.error("Firestore connection test failed:", error);
        toast({
            title: t('settings.toast.firestore.error.title'),
            description: t('settings.toast.firestore.error.description'),
            variant: 'destructive',
        });
    } finally {
        setIsTestingFirestore(false);
    }
  };


  return (
    <AppLayout>
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
                    <Label htmlFor="report-email">{t('settings.general.reportEmail.label')}</Label>
                    <p className="text-sm text-muted-foreground">
                        {t('settings.general.reportEmail.description')}
                    </p>
                 </div>
                <div className="flex items-center gap-2 w-auto">
                  <Input 
                    id="report-email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="w-[240px]"
                    value={localSettings.reportEmail}
                    onChange={(e) => handleSettingChange('reportEmail', e.target.value)}
                  />
                  <Button variant="outline" onClick={handleSendTestEmail} disabled={isSendingTest}>
                    {isSendingTest ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Mail className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

               <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.general.connection.label')}</Label>
                   <p className="text-sm text-muted-foreground">
                     {t('settings.general.connection.description')}
                  </p>
                </div>
                  <Button variant="outline" onClick={handleTestFirestore} disabled={isTestingFirestore}>
                    {isTestingFirestore ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                       <Database className="mr-2 h-4 w-4" />
                    )}
                    {t('settings.general.connection.button')}
                  </Button>
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
                  onValueChange={(value: 'weekly' | 'monthly' | 'annually') => handleSettingChange('exportFrequency', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
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
                            variant={localSettings.exportMethod === 'email' ? 'default' : 'outline'}
                            className="w-[120px]"
                            onClick={() => handleSettingChange('exportMethod', 'email')}
                        >
                            <Mail className="mr-2" />
                            {t('settings.export.method.email')}
                        </Button>
                        <Button 
                            variant={localSettings.exportMethod === 'download' ? 'default' : 'outline'}
                            className="w-[120px]"
                            onClick={() => handleSettingChange('exportMethod', 'download')}
                        >
                            <Download className="mr-2" />
                            {t('settings.export.method.download')}
                        </Button>
                    </div>
                </div>
                {localSettings.exportMethod === 'email' && (
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-2 w-[380px]">
                            <Input id="alternative-email" type="email" placeholder={t('settings.export.method.altEmail')} className="flex-1" />
                            <Button variant="secondary">{t('settings.export.method.send')}</Button>
                        </div>
                    </div>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.export.backup.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.export.backup.description')}
                  </p>
                </div>
                <Switch 
                  id="cloud-backup-switch"
                  checked={localSettings.cloudBackup}
                  onCheckedChange={(checked) => handleSettingChange('cloudBackup', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>{t('settings.export.session.label')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.export.session.description')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline">
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
            <CardFooter className="justify-end">
                <Button onClick={handleSave}>
                  <Save className="mr-2" />
                  {t('settings.save')}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
