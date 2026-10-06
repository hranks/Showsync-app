'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Disc3, Lock, ShieldCheck, UserPlus, LogIn, Sparkles, AlertCircle, Loader2, KeyRound, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { googleSignIn } from '@/lib/auth';
import { findOrCreateUserSpreadsheet } from '@/lib/sheets';
import type { DJUser } from '@/types';

export function LoginScreen() {
  const { loginUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign up form state
  const [stageName, setStageName] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'NIO' | 'EUR'>('USD');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // PIN / Master password fallback state
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [pinError, setPinError] = useState(false);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { toast } = useToast();

  // Cryptographic SHA-256 for PIN
  const hashSha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * FLIGHT A: INICIAR SESIÓN (Sign In con cuenta existente)
   */
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Google OAuth 2.0 PKCE Flow
      const googleAuth = await googleSignIn();
      if (!googleAuth || !googleAuth.user) {
        throw new Error('No se pudo autenticar con Google.');
      }

      const { user, accessToken } = googleAuth;

      // 2. Comprobar si el usuario está registrado en el sistema
      const verifyRes = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email
        })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        if (verifyRes.status === 404) {
          // El usuario NO está registrado
          setErrorMessage(`La cuenta (${user.email}) no está registrada en DJ Ledger. Por favor, selecciona la pestaña 'Registrarse' para crear tu cuenta.`);
          toast({
            title: 'Cuenta no registrada',
            description: 'No encontramos tu cuenta de DJ. Por favor, completa el registro primero.',
            variant: 'destructive'
          });
          setActiveTab('signup');
          return;
        }
        throw new Error(verifyData.message || 'Error en el inicio de sesión.');
      }

      // 3. Login Exitoso
      const djUser: DJUser = verifyData.user;
      loginUser(djUser);

      toast({
        title: '¡Bienvenido de vuelta!',
        description: `Sesión iniciada como ${djUser.stageName || djUser.displayName}.`,
      });
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMessage(err.message || 'Error de conexión durante el inicio de sesión.');
      toast({
        title: 'Error de inicio de sesión',
        description: err.message || 'No se pudo completar el inicio de sesión con Google.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * FLIGHT B: REGISTRO (Sign Up / Alta de nuevo DJ y aprovisionamiento de base de datos)
   */
  const handleGoogleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!stageName.trim()) {
      setErrorMessage('Por favor, ingresa tu Nombre Artístico o de DJ.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Debes aceptar los términos y la autorización de almacenamiento.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Google OAuth 2.0
      const googleAuth = await googleSignIn();
      if (!googleAuth || !googleAuth.user) {
        throw new Error('No se pudo autenticar con Google.');
      }

      const { user, accessToken } = googleAuth;

      // 2. Verificar que no esté ya registrado
      const checkRes = await fetch(`/api/auth/verify?email=${encodeURIComponent(user.email || '')}&uid=${encodeURIComponent(user.uid)}`);
      const checkData = await checkRes.json();

      if (checkData.exists) {
        setErrorMessage(`La cuenta (${user.email}) ya está registrada. Redirigiendo a Iniciar Sesión...`);
        toast({
          title: 'Cuenta ya existente',
          description: 'Esta cuenta ya está registrada. Iniciando sesión...',
        });
        loginUser(checkData.user);
        return;
      }

      // 3. Aprovisionamiento automático de la hoja en su Google Drive
      toast({
        title: 'Configurando tu espacio...',
        description: 'Aprovisionando tu base de datos en Google Drive / Sheets.',
      });

      const { spreadsheetId } = await findOrCreateUserSpreadsheet(accessToken, stageName.trim());

      // 4. Registrar en el sistema
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || stageName.trim(),
          stageName: stageName.trim(),
          photoURL: user.photoURL || '',
          spreadsheetId
        })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        throw new Error(regData.message || 'Error al completar el registro.');
      }

      // 5. Alta completada e inicio de sesión
      const newDJUser: DJUser = regData.user;
      loginUser(newDJUser);

      toast({
        title: '🎉 ¡Registro Exitoso!',
        description: `Tu cuenta de ${newDJUser.stageName} y tu Google Sheet han sido creados correctamente.`,
      });
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMessage(err.message || 'Hubo un inconveniente al crear tu cuenta.');
      toast({
        title: 'Error de registro',
        description: err.message || 'No se pudo crear la cuenta.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * FLIGHT C: ACCESO LOCAL POR PIN / MODO ADMINISTRADOR OFFLINE
   */
  const handlePinChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);
    setPinError(false);

    if (val && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handleAdminPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinStr = pin.join('');
    if (pinStr.length < 6) return;

    const hash = await hashSha256(pinStr);
    // Master PIN: "309410"
    if (hash === 'c94ada0165659e21e87086588836f8e5e36087aafbc4cefb9a3629fa5f9ab270') {
      const masterUser: DJUser = {
        uid: 'usr_master_ranks',
        email: 'ranksnica@gmail.com',
        displayName: 'Dj Ranks Nicaragua',
        stageName: 'Dj Ranks Nicaragua',
      };
      loginUser(masterUser);
      toast({
        title: 'Acceso Maestro Autorizado',
        description: 'Sesión iniciada como Administrador Maestro.',
      });
    } else {
      setPinError(true);
      toast({
        title: 'PIN Incorrecto',
        description: 'El PIN de administrador no es válido.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Luces de fondo y atmósfera DJ */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-primary via-indigo-500 to-cyan-400 p-0.5 shadow-2xl shadow-primary/30 flex items-center justify-center mb-3">
            <div className="h-full w-full bg-background/90 rounded-[14px] flex items-center justify-center">
              <Disc3 className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-white">
            DJ LEDGER
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Gestión profesional de eventos, honorarios y sincronización con Google Sheets.
          </p>
        </div>

        {/* Card Principal con Selector de Modo */}
        <Card className="border-border/60 shadow-2xl bg-card/80 backdrop-blur-xl">
          
          {/* Selector de Pestañas: Iniciar Sesión vs Registro */}
          <div className="p-2 border-b border-border/60 grid grid-cols-2 gap-1.5 bg-muted/30">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'signin'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'signup'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Registrarse
            </button>
          </div>

          <CardHeader className="pt-6 pb-2">
            <CardTitle className="text-lg font-bold text-center">
              {activeTab === 'signin' ? 'Acceso a tu Panel de DJ' : 'Crear Nueva Cuenta de DJ'}
            </CardTitle>
            <CardDescription className="text-xs text-center">
              {activeTab === 'signin'
                ? 'Conecta con tu cuenta de Google verificada para abrir tu base de datos.'
                : 'Regístrate con tu Gmail y aprovisionaremos automáticamente tu hoja en Google Drive.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            
            {/* Mensaje de Error / Notificación */}
            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="flex-1 font-medium">{errorMessage}</p>
              </div>
            )}

            {/* TAB 1: INICIAR SESIÓN */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Autenticación segura mediante Google OAuth 2.0</span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isProcessing}
                    className="w-full py-6 font-bold bg-white text-slate-900 hover:bg-slate-100 hover:text-black shadow-lg flex items-center justify-center gap-3 transition-all"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span className="text-sm">
                      {isProcessing ? 'Verificando con Google...' : 'Iniciar Sesión con Google'}
                    </span>
                  </Button>
                </div>

                {/* Opción de Registro rápido si no tiene cuenta */}
                <div className="text-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    ¿Primera vez aquí?{' '}
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
                      className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Regístrate gratis <ArrowRight className="w-3 h-3" />
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTRO */}
            {activeTab === 'signup' && (
              <form onSubmit={handleGoogleSignUp} className="space-y-4">
                <div className="space-y-3">
                  
                  {/* Nombre Artístico */}
                  <div className="space-y-1.5">
                    <Label htmlFor="stageName" className="text-xs font-semibold">
                      Nombre Artístico o DJ Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stageName"
                      required
                      placeholder="Ej. DJ Frank / DJ Ranks"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      className="bg-background/60 text-sm"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Moneda Principal */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Moneda Principal de Cobro</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['USD', 'NIO', 'EUR'] as const).map((curr) => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => setCurrency(curr)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            currency === curr
                              ? 'bg-primary/15 border-primary text-primary shadow-sm'
                              : 'border-border/60 bg-background/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {curr === 'USD' ? 'USD ($)' : curr === 'NIO' ? 'NIO (C$)' : 'EUR (€)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Checkbox de Términos y Almacenamiento */}
                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                      disabled={isProcessing}
                    />
                    <label
                      htmlFor="terms"
                      className="text-[11px] text-muted-foreground leading-tight cursor-pointer"
                    >
                      Acepto vincular mi cuenta de Google para que DJ Ledger aprovisione de forma privada mi hoja de cálculo y respaldos en mi Google Drive personal.
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || !stageName.trim() || !termsAccepted}
                  className="w-full py-6 font-bold text-white bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 hover:opacity-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creando tu base de datos...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Crear Cuenta con Google</span>
                    </>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <p className="text-xs text-muted-foreground">
                    ¿Ya te registraste anteriormente?{' '}
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
                      className="text-primary font-bold hover:underline"
                    >
                      Inicia Sesión aquí
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Accordion / Desplegable para Acceso Offline de Emergencia (PIN Maestro) */}
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAdminPin(!showAdminPin)}
                className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-1"
              >
                <KeyRound className="w-3 h-3 text-muted-foreground" />
                <span>{showAdminPin ? 'Ocultar acceso de emergencia' : 'Acceso de emergencia con PIN'}</span>
              </button>

              {showAdminPin && (
                <form onSubmit={handleAdminPinSubmit} className="mt-3 p-3 bg-muted/40 rounded-xl border border-border/50 space-y-3">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Ingresa el PIN maestro de 6 dígitos para acceso local sin conexión.
                  </p>
                  <div className="flex justify-center gap-1.5">
                    {pin.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { pinInputRefs.current[idx] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePinChange(idx, e.target.value)}
                        onKeyDown={(e) => handlePinKeyDown(idx, e)}
                        className={`w-9 h-11 text-center font-mono text-base font-bold bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                          pinError ? 'border-destructive ring-1 ring-destructive' : 'border-border'
                        }`}
                      />
                    ))}
                  </div>
                  <Button type="submit" size="sm" variant="secondary" className="w-full text-xs font-semibold">
                    Entrar con PIN
                  </Button>
                </form>
              )}
            </div>

          </CardContent>

          <CardFooter className="py-3 bg-muted/20 border-t border-border/40 flex items-center justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              Tus datos residen de forma 100% aislada en tu propio Google Drive
            </span>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
