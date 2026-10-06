'use client';

import React, { useState, useRef } from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Disc3, 
  Lock, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  KeyRound, 
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { googleSignIn } from '@/lib/auth';
import { findOrCreateUserSpreadsheet, saveUserProfileToSheet } from '@/lib/sheets';
import type { DJUser } from '@/types';

export function LoginScreen() {
  const { loginUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'pin_signin'>('signin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign up form state
  const [stageName, setStageName] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  // PIN Sign In state
  const [loginPin, setLoginPin] = useState<string[]>(Array(6).fill(''));
  const [pinError, setPinError] = useState(false);
  const [pinIdentifier, setPinIdentifier] = useState('');
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
   * FLIGHT 1: INICIAR SESIÓN CON GOOGLE ACCOUNT
   */
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Google OAuth 2.0 PKCE Flow
      const googleAuth = await googleSignIn();
      if (!googleAuth || !googleAuth.user) {
        throw new Error('No se pudo completar la autenticación con Google.');
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
          setErrorMessage(`La cuenta Google (${user.email}) aún no está registrada. Completa tu registro como DJ a continuación.`);
          toast({
            title: 'Registro Requerido',
            description: 'Tu cuenta de Google no está registrada como DJ. Por favor crea tu perfil.',
            variant: 'destructive'
          });
          setActiveTab('signup');
          return;
        }
        throw new Error(verifyData.message || 'Error en el inicio de sesión.');
      }

      // 3. Login Exitoso
      const djUser: DJUser = verifyData.user;
      
      // Sincronizar / respaldar si tiene spreadsheet
      if (djUser.spreadsheetId && accessToken) {
        saveUserProfileToSheet(accessToken, djUser.spreadsheetId, djUser).catch(() => {});
      }

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
   * FLIGHT 2: REGISTRO OBLIGATORIO CON GOOGLE ACCOUNT + NOMBRE DJ + PIN DE ACCESO
   * Guarda los datos en el Google Account (Google Drive / Sheets) y en el sistema.
   */
  const handleGoogleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validaciones
    if (!stageName.trim()) {
      setErrorMessage('Por favor, ingresa tu Nombre Artístico o de DJ.');
      return;
    }

    if (!regPin || regPin.length < 4 || regPin.length > 6 || !/^\d+$/.test(regPin)) {
      setErrorMessage('El PIN de acceso debe contener entre 4 y 6 dígitos numéricos.');
      return;
    }

    if (regPin !== regConfirmPin) {
      setErrorMessage('Los PINs ingresados no coinciden. Por favor verifícalos.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Debes autorizar el aprovisionamiento de datos en tu Google Drive.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Google OAuth 2.0 Obligatorio
      toast({
        title: 'Conectando con Google...',
        description: 'Autentica con tu cuenta de Google para vincular tu identidad y Drive.',
      });

      const googleAuth = await googleSignIn();
      if (!googleAuth || !googleAuth.user) {
        throw new Error('Es obligatorio autenticarse con tu cuenta de Google para registrarse.');
      }

      const { user, accessToken } = googleAuth;

      // 2. Verificar que no esté ya registrado
      const checkRes = await fetch(`/api/auth/verify?email=${encodeURIComponent(user.email || '')}&uid=${encodeURIComponent(user.uid)}`);
      const checkData = await checkRes.json();

      if (checkData.exists) {
        setErrorMessage(`La cuenta (${user.email}) ya está registrada. Iniciando tu sesión...`);
        toast({
          title: 'Cuenta ya existente',
          description: 'Esta cuenta ya está registrada. Redirigiendo...',
        });
        loginUser(checkData.user);
        return;
      }

      // 3. Generar hash criptográfico del PIN de acceso
      const pinHash = await hashSha256(regPin);

      // 4. Aprovisionamiento automático en su Google Account (Google Drive / Google Sheets)
      toast({
        title: 'Creando tu espacio en Google Drive...',
        description: 'Generando tu base de datos privada en tu cuenta de Google.',
      });

      const { spreadsheetId } = await findOrCreateUserSpreadsheet(accessToken, stageName.trim());

      // 5. Guardar perfil y credenciales directamente en su Google Account / Sheet
      await saveUserProfileToSheet(accessToken, spreadsheetId, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || stageName.trim(),
        stageName: stageName.trim(),
        pinHash,
        createdAt: new Date().toISOString()
      });

      // 6. Registrar en el backend
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || stageName.trim(),
          stageName: stageName.trim(),
          pinHash,
          photoURL: user.photoURL || '',
          spreadsheetId
        })
      });

      const regData = await regRes.json();

      if (!regRes.ok) {
        throw new Error(regData.message || 'Error al completar el registro.');
      }

      // 7. Inicio de sesión exitoso
      const newDJUser: DJUser = regData.user;
      loginUser(newDJUser);

      toast({
        title: '🎉 ¡Registro Completado con Éxito!',
        description: `Tu perfil de ${newDJUser.stageName}, tu PIN de seguridad y tu base de datos en Google Sheets han sido creados.`,
      });
    } catch (err: any) {
      console.error('Sign up error:', err);
      setErrorMessage(err.message || 'Hubo un inconveniente al crear tu cuenta.');
      toast({
        title: 'Error en el Registro',
        description: err.message || 'No se pudo completar el registro con Google.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * FLIGHT 3: ACCESO RÁPIDO CON PIN
   */
  const handlePinDigitChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const newPin = [...loginPin];
    newPin[index] = val;
    setLoginPin(newPin);
    setPinError(false);

    if (val && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !loginPin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const pinStr = loginPin.join('');
    if (pinStr.length < 4) {
      setErrorMessage('Ingresa al menos 4 dígitos de tu PIN.');
      return;
    }

    setIsProcessing(true);

    try {
      const pinHash = await hashSha256(pinStr);

      const res = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: pinStr,
          pinHash,
          emailOrStageName: pinIdentifier.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setPinError(true);
        throw new Error(data.message || 'PIN de acceso incorrecto.');
      }

      loginUser(data.user);
      toast({
        title: 'Acceso Autorizado',
        description: `Bienvenido de nuevo, ${data.user.stageName || data.user.displayName}.`,
      });
    } catch (err: any) {
      console.error('PIN Login error:', err);
      setErrorMessage(err.message || 'PIN incorrecto.');
      toast({
        title: 'Error de PIN',
        description: err.message || 'PIN de acceso inválido.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Luces y ambientación DJ Studio */}
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
            Sistema profesional de eventos con almacenamiento en tu propia cuenta de Google.
          </p>
        </div>

        {/* Card Principal */}
        <Card className="border-border/60 shadow-2xl bg-card/80 backdrop-blur-xl">
          
          {/* Selector de Pestañas: Iniciar Sesión vs Registro vs PIN */}
          <div className="p-1.5 border-b border-border/60 grid grid-cols-3 gap-1 bg-muted/30">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Google</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('pin_signin'); setErrorMessage(null); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'pin_signin'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
              className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registro</span>
            </button>
          </div>

          <CardHeader className="pt-5 pb-2">
            <CardTitle className="text-lg font-bold text-center">
              {activeTab === 'signin' && 'Acceso con Google Account'}
              {activeTab === 'pin_signin' && 'Acceso Rápido con PIN'}
              {activeTab === 'signup' && 'Registro de Nuevo DJ'}
            </CardTitle>
            <CardDescription className="text-xs text-center">
              {activeTab === 'signin' && 'Inicia sesión con tu cuenta de Google para acceder a tus eventos y hojas.'}
              {activeTab === 'pin_signin' && 'Ingresa tu PIN de 4 a 6 dígitos para desbloqueo instantáneo.'}
              {activeTab === 'signup' && 'Regístrate con tu Google Account, define tu nombre de DJ y crea tu PIN de acceso.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            
            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2.5 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="flex-1 font-medium">{errorMessage}</p>
              </div>
            )}

            {/* TAB 1: INICIAR SESIÓN CON GOOGLE */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-xl border border-border/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Autenticación oficial OAuth 2.0 con Google</span>
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
                      {isProcessing ? 'Verificando cuenta...' : 'Iniciar Sesión con Google'}
                    </span>
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-1">
                  <span>¿Tienes PIN de acceso?</span>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('pin_signin'); setErrorMessage(null); }}
                    className="text-primary font-bold hover:underline inline-flex items-center gap-1"
                  >
                    Entrar con PIN <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    ¿Nuevo en DJ Ledger?{' '}
                    <button
                      type="button"
                      onClick={() => { setActiveTab('signup'); setErrorMessage(null); }}
                      className="text-primary font-bold hover:underline"
                    >
                      Regístrate gratis aquí
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: ACCESO CON PIN */}
            {activeTab === 'pin_signin' && (
              <form onSubmit={handlePinLoginSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="pinIdentifier" className="text-xs font-semibold">
                      Nombre de DJ o Correo (Opcional)
                    </Label>
                    <Input
                      id="pinIdentifier"
                      placeholder="Ej. DJ Ranks o tu correo"
                      value={pinIdentifier}
                      onChange={(e) => setPinIdentifier(e.target.value)}
                      className="bg-background/60 text-xs h-9"
                      disabled={isProcessing}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-center block">
                      Ingresa tu PIN de Acceso (4 a 6 dígitos)
                    </Label>
                    <div className="flex justify-center gap-2">
                      {loginPin.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { pinInputRefs.current[idx] = el; }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinDigitKeyDown(idx, e)}
                          className={`w-10 h-12 text-center font-mono text-lg font-bold bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                            pinError ? 'border-destructive ring-1 ring-destructive' : 'border-border'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || loginPin.join('').length < 4}
                  className="w-full py-5 font-bold"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
                  Desbloquear con PIN
                </Button>

                <div className="text-center pt-1 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('signin'); setErrorMessage(null); }}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    ← Volver a inicio de sesión con Google
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: REGISTRO OBLIGATORIO CON GOOGLE ACCOUNT + NOMBRE DJ + PIN */}
            {activeTab === 'signup' && (
              <form onSubmit={handleGoogleSignUp} className="space-y-3.5">
                <div className="space-y-3">
                  
                  {/* Nombre Artístico / DJ Name */}
                  <div className="space-y-1">
                    <Label htmlFor="regStageName" className="text-xs font-semibold">
                      Nombre Artístico o DJ Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="regStageName"
                      required
                      placeholder="Ej. DJ Frank / DJ Ranks"
                      value={stageName}
                      onChange={(e) => setStageName(e.target.value)}
                      className="bg-background/60 text-sm h-10"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Crear PIN de Acceso */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="regPin" className="text-xs font-semibold flex items-center justify-between">
                        <span>PIN de Acceso <span className="text-destructive">*</span></span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="regPin"
                          type={showRegPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="4-6 dígitos"
                          value={regPin}
                          onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                          className="bg-background/60 text-sm font-mono tracking-widest h-10 pr-8"
                          disabled={isProcessing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPin(!showRegPin)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showRegPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="regConfirmPin" className="text-xs font-semibold">
                        Confirmar PIN <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="regConfirmPin"
                        type={showRegPin ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Repite tu PIN"
                        value={regConfirmPin}
                        onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="bg-background/60 text-sm font-mono tracking-widest h-10"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* Tarjeta de integración con Google Account */}
                  <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Database className="w-4 h-4 text-primary" />
                      <span>Almacenamiento en tu Google Account</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Al registrarte, se vinculará tu <strong>Google Account</strong> para crear y guardar automáticamente tu base de datos de eventos, locales y credenciales en tu propio Google Drive personal.
                    </p>

                    <div className="flex items-start space-x-2 pt-1">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(!!checked)}
                        disabled={isProcessing}
                      />
                      <label
                        htmlFor="terms"
                        className="text-[10.5px] text-muted-foreground leading-tight cursor-pointer"
                      >
                        Autorizo guardar mi información y sincronizar mi Google Sheet de forma privada.
                      </label>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || !stageName.trim() || regPin.length < 4 || regPin !== regConfirmPin || !termsAccepted}
                  className="w-full py-6 font-bold text-white bg-gradient-to-r from-primary via-indigo-600 to-cyan-600 hover:opacity-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Aprovisionando en tu Google Account...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Registrar con Google Account</span>
                    </>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <p className="text-xs text-muted-foreground">
                    ¿Ya te registraste?{' '}
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

          </CardContent>

          <CardFooter className="py-3 bg-muted/20 border-t border-border/40 flex items-center justify-center text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-500" />
              Tus datos y PIN se guardan con seguridad en tu Google Account
            </span>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
