'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Disc3, Eye, EyeOff, Delete, Lock, User, KeyRound } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function LoginScreen() {
  const { login } = useAuthStore();
  const [loginMethod, setLoginMethod] = useState<'pin' | 'password'>('pin');
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [showPin, setShowPin] = useState(false);
  
  // Password login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isError, setIsError] = useState(false);
  const [shake, setShake] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Seed default user
  useEffect(() => {
    const existingUsers = localStorage.getItem('dj_users');
    if (!existingUsers) {
      localStorage.setItem('dj_users', JSON.stringify([{
        name: "Dj Ranks Nicaragua",
        email: "ranksnica@gmail.com",
        password: "palacios94@rk",
        pin: "309410"
      }]));
    }
  }, []);

  // Auto focus first PIN input or identifier on login method change
  useEffect(() => {
    if (loginMethod === 'pin') {
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 50);
    }
  }, [loginMethod]);

  const handlePinChange = (value: string, index: number) => {
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setIsError(false);

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(digit => digit !== '')) {
      validatePin(newPin.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      }
      setIsError(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^[0-9]{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setPin(digits);
      validatePin(pastedData);
    }
  };

  const validatePin = (enteredPin: string) => {
    const users = JSON.parse(localStorage.getItem('dj_users') || '[]');
    const matchedUser = users.find((u: any) => u.pin === enteredPin) || 
      (enteredPin === "309410" ? { name: "Dj Ranks Nicaragua" } : null);

    if (matchedUser) {
      login(matchedUser.name);
      toast({
        title: "Acceso concedido",
        description: `Sesión iniciada como ${matchedUser.name}`,
      });
    } else {
      setIsError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      toast({
        title: "PIN incorrecto",
        description: "El PIN ingresado no es válido. Inténtalo de nuevo.",
        variant: "destructive",
      });
      
      setPin(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsError(false);

    const users = JSON.parse(localStorage.getItem('dj_users') || '[]');
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    const matchedUser = users.find((u: any) => 
      (u.email.toLowerCase() === normalizedIdentifier || u.name.toLowerCase() === normalizedIdentifier) && 
      u.password === cleanPassword
    );

    if (matchedUser) {
      login(matchedUser.name);
      toast({
        title: "Acceso concedido",
        description: `Sesión iniciada como ${matchedUser.name}`,
      });
    } else {
      setIsError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      toast({
        title: "Credenciales incorrectas",
        description: "El usuario o la contraseña son incorrectos.",
        variant: "destructive",
      });
    }
  };

  const handleKeypadPress = (num: string) => {
    const firstEmptyIndex = pin.findIndex(digit => digit === '');
    
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = num;
      setPin(newPin);
      setIsError(false);

      if (firstEmptyIndex < 5) {
        inputRefs.current[firstEmptyIndex + 1]?.focus();
      } else {
        validatePin(newPin.join(''));
      }
    }
  };

  const handleKeypadBackspace = () => {
    let lastFilledIndex = -1;
    for (let i = 5; i >= 0; i--) {
      if (pin[i] !== '') {
        lastFilledIndex = i;
        break;
      }
    }

    if (lastFilledIndex !== -1) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
      setIsError(false);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleKeypadClear = () => {
    setPin(Array(6).fill(''));
    setIsError(false);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 select-none">
      <Card className={cn("w-full max-w-md transition-all duration-300 shadow-2xl border-muted", shake && "animate-shake")}>
        <CardHeader className="space-y-1 text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="relative bg-primary/10 p-4 rounded-full border border-primary/20 animate-pulse">
              <Disc3 className="w-12 h-12 text-primary animate-[spin_8s_linear_infinite]" />
              <Lock className="w-5 h-5 text-secondary absolute bottom-1 right-1 bg-background p-1 rounded-full border border-secondary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            DJ Ledger
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground pt-1">
            {loginMethod === 'pin' 
              ? 'Ingresa tu PIN de 6 dígitos para acceder' 
              : 'Inicia sesión con tu correo o contraseña'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Method Toggles */}
          <div className="flex w-full p-1 bg-muted rounded-xl border border-muted/50">
            <button 
              type="button"
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200", 
                loginMethod === 'pin' 
                  ? "bg-background text-foreground shadow-sm font-bold border border-muted" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/20"
              )}
              onClick={() => {
                setLoginMethod('pin');
                setIsError(false);
              }}
            >
              PIN
            </button>
            <button 
              type="button"
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200", 
                loginMethod === 'password' 
                  ? "bg-background text-foreground shadow-sm font-bold border border-muted" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/20"
              )}
              onClick={() => {
                setLoginMethod('password');
                setIsError(false);
              }}
            >
              Contraseña
            </button>
          </div>

          {loginMethod === 'pin' ? (
            <div className="space-y-6">
              {/* PIN Input Display */}
              <div className="relative flex flex-col items-center">
                <div className="flex items-center gap-2 justify-center w-full my-2">
                  {pin.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(e.target.value, index)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onPaste={index === 0 ? handlePaste : undefined}
                      className={cn(
                        "w-12 h-14 text-center text-2xl font-bold rounded-lg border bg-muted focus:bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-150",
                        isError 
                          ? 'border-destructive text-destructive bg-destructive/5 ring-destructive' 
                          : digit !== '' 
                            ? 'border-secondary text-foreground' 
                            : 'border-border'
                      )}
                      aria-label={`Dígito ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Toggle PIN visibility button */}
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-0 -bottom-8 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Mostrar
                    </>
                  )}
                </button>
              </div>

              <div className="pt-6">
                {/* Visual Numeric Keypad */}
                <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant="outline"
                      onClick={() => handleKeypadPress(num)}
                      className="h-12 text-xl font-semibold rounded-xl hover:bg-primary/10 hover:border-primary/40 active:scale-95 transition-transform"
                    >
                      {num}
                    </Button>
                  ))}
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleKeypadClear}
                    className="h-12 text-sm font-medium rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                  >
                    Limpiar
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleKeypadPress('0')}
                    className="h-12 text-xl font-semibold rounded-xl hover:bg-primary/10 hover:border-primary/40 active:scale-95 transition-transform"
                  >
                    0
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleKeypadBackspace}
                    className="h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                    aria-label="Borrar"
                  >
                    <Delete className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="identifier">Nombre de usuario o correo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="correo@ejemplo.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 font-medium py-2 rounded-lg transition-all duration-200"
              >
                Entrar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
