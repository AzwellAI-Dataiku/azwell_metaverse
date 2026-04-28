import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token as string;
  if (!token) return next(new Error('인증 토큰이 필요합니다'));

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as { userId: number };
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('유효하지 않은 토큰입니다'));
  }
}
