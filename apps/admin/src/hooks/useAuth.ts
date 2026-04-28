import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface AuthState {
  token: string | null;
  isAdmin: boolean | null;
}

let globalState: AuthState = {
  token: localStorage.getItem('admin_token'),
  isAdmin: null,
};
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function useAuth() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Check admin on mount if token exists but isAdmin not checked yet
  useEffect(() => {
    if (globalState.token && globalState.isAdmin === null) {
      api.get('/admin/me')
        .then(() => { globalState.isAdmin = true; notify(); })
        .catch(() => { globalState.isAdmin = false; notify(); });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('admin_token', data.token);
    globalState.token = data.token;
    // Check admin
    try {
      await api.get('/admin/me');
      globalState.isAdmin = true;
    } catch {
      globalState.isAdmin = false;
    }
    notify();
    return globalState.isAdmin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    globalState = { token: null, isAdmin: null };
    notify();
  }, []);

  return { token: globalState.token, isAdmin: globalState.isAdmin, login, logout };
}
