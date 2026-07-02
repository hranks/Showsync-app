import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (name: string, email: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem('dj_auth') === 'true',
  user: localStorage.getItem('dj_user') 
    ? JSON.parse(localStorage.getItem('dj_user')!) 
    : null,
  login: (name, email) => {
    localStorage.setItem('dj_auth', 'true');
    localStorage.setItem('dj_user', JSON.stringify({ name, email }));
    set({ isAuthenticated: true, user: { name, email } });
  },
  logout: () => {
    localStorage.removeItem('dj_auth');
    localStorage.removeItem('dj_user');
    set({ isAuthenticated: false, user: null });
  },
}));
