export interface User {
  id: number;
  email: string;
  nickname: string;
  level: number;
  xp: number;
  gold: number;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type PresenceMode = 'available' | 'busy' | 'afk';

export interface PresenceInfo {
  mode: PresenceMode;
  message: string | null;
  brbUntil: number | null; // epoch ms, optional auto-expiry
}

export interface MemberSummary {
  id: number;
  nickname: string;
  level: number;
  isOnline: boolean;
  presence: PresenceInfo | null;
}
