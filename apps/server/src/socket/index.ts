import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { config } from '../config.js';
import { socketAuthMiddleware } from './middleware/auth.js';
import { registerMovementHandlers, flushAndRemovePosition } from './handlers/movement.js';
import { registerFloorHandlers, getPlayerState } from './handlers/floor.js';
import { registerInteractionHandlers } from './handlers/interaction.js';
import { registerChatHandlers } from './handlers/chat.js';
import { registerItemBoxHandlers, initItemBoxSystem } from './handlers/itembox.js';
import { registerArenaHandlers, initArenaSystem } from './handlers/arena.js';
import { setPresence, clearPresence } from './presence.js';
import type { ServerToClientEvents, ClientToServerEvents, PresenceMode } from '@metaverse/shared';

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function setupSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: [config.CLIENT_URL, config.ADMIN_URL],
      methods: ['GET', 'POST'],
    },
  });

  ioInstance = io;
  io.use(socketAuthMiddleware as any);

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as number;
    console.log(`User ${userId} connected`);

    socket.join(`user:${userId}`);

    // First-connection detection
    const userRoomSockets = await io.in(`user:${userId}`).fetchSockets();
    const isFirstConnection = userRoomSockets.length === 1;
    if (isFirstConnection) {
      socket.broadcast.emit('user:online', { userId });
    }

    registerMovementHandlers(io as any, socket);
    registerFloorHandlers(io as any, socket);
    registerInteractionHandlers(io as any, socket);
    registerChatHandlers(io as any, socket);
    registerItemBoxHandlers(io as any, socket);
    registerArenaHandlers(io as any, socket);

    socket.on('presence:update', (data) => {
      const allowedModes: PresenceMode[] = ['available', 'busy', 'afk'];
      if (!allowedModes.includes(data.mode)) return;
      const message = typeof data.message === 'string' ? data.message.slice(0, 100) : null;
      const brbUntil = typeof data.brbUntil === 'number' && data.brbUntil > Date.now() ? data.brbUntil : null;
      const info = setPresence(userId, data.mode, message, brbUntil);
      // 같은 층 유저에게만 프레즌스 변경 전송
      const floor = socket.data.floor as number | undefined;
      if (floor) {
        io.to(`floor:${floor}`).emit('user:presence-changed', { userId, presence: info });
      }
    });

    socket.on('presence:clear', () => {
      clearPresence(userId);
      const floor = socket.data.floor as number | undefined;
      if (floor) {
        io.to(`floor:${floor}`).emit('user:presence-changed', { userId, presence: null });
      }
    });

    const playerState = await getPlayerState(userId);
    if (playerState) {
      socket.data.floor = playerState.floor;
      socket.join(`floor:${playerState.floor}`);
      socket.to(`floor:${playerState.floor}`).emit('player:joined', playerState);

      // 병렬로 같은 층 플레이어 조회
      const sockets = await io.in(`floor:${playerState.floor}`).fetchSockets();
      const otherUserIds = sockets
        .map((s) => s.data.userId as number)
        .filter((id) => id !== userId);

      if (otherUserIds.length > 0) {
        const results = await Promise.all(otherUserIds.map((id) => getPlayerState(id)));
        const players = results.filter((s) => s !== null);
        socket.emit('floor:players', players);
      } else {
        socket.emit('floor:players', []);
      }
    }

    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);
      const floor = socket.data.floor as number | undefined;
      if (floor) {
        socket.to(`floor:${floor}`).emit('player:left', userId);
      }

      // 위치 캐시를 DB에 저장 후 제거
      await flushAndRemovePosition(userId);

      // Only emit offline when the last socket for this user disconnects
      const remaining = await io.in(`user:${userId}`).fetchSockets();
      if (remaining.length === 0) {
        clearPresence(userId);
        if (floor) {
          io.to(`floor:${floor}`).emit('user:presence-changed', { userId, presence: null });
        }
        io.emit('user:offline', { userId });
      }
    });
  });

  // 아이템 박스 스폰 시스템 시작
  initItemBoxSystem(io as any);

  // 아레나 시스템 시작
  initArenaSystem(io as any);

  return io;
}
