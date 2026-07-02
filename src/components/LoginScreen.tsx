import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Disc3 } from 'lucide-react';
import { cn } from '../lib/utils';

export function LoginScreen() {
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [error, setError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = JSON.parse(localStorage.getItem('dj_users') || '[]');
    const normalizedIdentifier = identifier.trim().toLowerCase();

    let validUser;
    
    if (loginMethod === 'password') {
      validUser = users.find((u: any) => 
        (u.email.toLowerCase() === normalizedIdentifier || u.name.toLowerCase() === normalizedIdentifier) && 
        u.password === password.trim()
      );
    } else {
      validUser = users.find((u: any) => 
        (u.email.toLowerCase() === normalizedIdentifier || u.name.toLowerCase() === normalizedIdentifier) && 
        u.pin === pin.trim()
      );
    }

    if (validUser) {
      login(validUser.name, validUser.email);
    } else {
      setError(loginMethod === 'password' ? 'Nombre de usuario o contraseña incorrectos' : 'Nombre de usuario o PIN incorrectos');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-black p-3 rounded-full">
            <Disc3 className="w-8 h-8 text-white animate-[spin_3s_linear_infinite]" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">DJ Ranks Nicaragua</h1>
        <p className="text-gray-500 text-center mb-6">Inicia sesión para registrar tus fechas</p>

        <div className="flex w-full mb-6 border rounded-lg overflow-hidden">
          <button 
            type="button"
            className={cn("flex-1 py-2 text-sm font-medium transition-colors", loginMethod === 'password' ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
            onClick={() => setLoginMethod('password')}
          >
            Contraseña
          </button>
          <button 
            type="button"
            className={cn("flex-1 py-2 text-sm font-medium transition-colors", loginMethod === 'pin' ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
            onClick={() => setLoginMethod('pin')}
          >
            PIN
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario o correo</label>
            <input
              type="text"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
              placeholder="dj@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          {loginMethod === 'password' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN de 6 dígitos</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="••••••"
                className="w-full p-2 text-center tracking-widest text-lg border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-black text-white font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
