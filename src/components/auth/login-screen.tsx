'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Disc3, Eye, EyeOff, Delete, Lock } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';

export function LoginScreen() {
  const { login } = useAuthStore();
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [showPin, setShowPin] = useState(false);
  const [isError, setIsError] = useState(false);
  const [shake, setShake] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const CORRECT_PIN = "309410";

  // Auto focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handlePinChange = (value: string, index: number) => {
    // Only allow numeric input
    if (value !== '' && !/^[0-9]$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setIsError(false);

    // Auto-focus next input if value is filled
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all fields are filled
    if (newPin.every(digit => digit !== '')) {
      validatePin(newPin.join(''));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        // Move focus back and clear that input
        const newPin = [...pin];
        newPin[index - 1] = '';
        setPin(newPin);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
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
    if (enteredPin === CORRECT_PIN) {
      login("Dj Ranks Nicaragua");
      toast({
        title: "Acceso concedido",
        description: "Sesión iniciada como Dj Ranks Nicaragua",
      });
    } else {
      // Incorrect PIN behavior
      setIsError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      toast({
        title: "PIN incorrecto",
        description: "El PIN ingresado no es válido. Inténtalo de nuevo.",
        variant: "destructive",
      });
      
      // Clear pin fields and focus first one
      setPin(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  // Helper for on-screen numeric keypad input
  const handleKeypadPress = (num: string) => {
    // Find the first empty input index
    const firstEmptyIndex = pin.findIndex(digit => digit === '');
    
    if (firstEmptyIndex !== -1) {
      const newPin = [...pin];
      newPin[firstEmptyIndex] = num;
      setPin(newPin);
      setIsError(false);

      // Focus that index or the next one
      if (firstEmptyIndex < 5) {
        inputRefs.current[firstEmptyIndex + 1]?.focus();
      } else {
        // If it was the last index, auto submit
        validatePin(newPin.join(''));
      }
    }
  };

  const handleKeypadBackspace = () => {
    // Find the last filled input index to delete
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
      <Card className={`w-full max-w-md transition-all duration-300 shadow-2xl border-muted ${shake ? 'animate-shake' : ''}`}>
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
            Ingresa tu PIN de 6 dígitos para acceder
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
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
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-lg border bg-muted focus:bg-background focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-150 ${
                    isError 
                      ? 'border-destructive text-destructive bg-destructive/5 ring-destructive' 
                      : digit !== '' 
                        ? 'border-secondary text-foreground' 
                        : 'border-border'
                  }`}
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
          

        </CardContent>
      </Card>
    </div>
  );
}
