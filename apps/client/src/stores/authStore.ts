import { create } from 'zustand';
import type { User } from '@metaverse/shared';
import * as api from '../services/api.js';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

function loadInitialAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      return { token, user: JSON.parse(userStr) as User, isAuthenticated: true };
    } catch {
      // 파싱 실패 시 초기화
    }
  }
  return { token: null, user: null, isAuthenticated: false };
}

const initial = loadInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  token: initial.token,
  isAuthenticated: initial.isAuthenticated,

  login: async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  register: async (email, password, nickname) => {
    const { token, user } = await api.register(email, password, nickname);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  updateNickname: async (nickname) => {
    const user = await api.updateNickname(nickname);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      set({ token, user: JSON.parse(userStr), isAuthenticated: true });
    }
  },
}));
