'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/use-auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Disc3 } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';

export function LoginScreen() {
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    // Seeding local database with the requested credentials
    const users = localStorage.getItem('dj_users');
    if (!users) {
      localStorage.setItem('dj_users', JSON.stringify([{
        name: "Dj Ranks Nicaragua",
        email: "ranksnica@gmail.com",
        password: "palacios94@rk"
      }]));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const usersString = localStorage.getItem('dj_users');
    const users = usersString ? JSON.parse(usersString) : [];

    const validUser = users.find((u: any) => 
      (u.email === identifier.trim() || u.name === identifier.trim()) && 
      u.password === password
    );

    if (validUser) {
      login(validUser.name);
      toast({
        title: "Sesión iniciada",
        description: `Bienvenido, ${validUser.name}`,
      });
    } else {
      toast({
        title: "Error de autenticación",
        description: "Nombre de usuario o contraseña incorrectos",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Disc3 className="w-10 h-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">DJ Ledger</CardTitle>
          <CardDescription>
            Inicia sesión para registrar tus fechas
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Nombre de usuario o correo</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="dj@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
