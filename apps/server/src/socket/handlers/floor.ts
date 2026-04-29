import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters, users } from '../../db/schema/index.js';
import type { PlayerState } from '@metaverse/shared';
import { incrementProgress } from '../../services/questService.js';

export function registerFloorHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('floor:join', async (floor: number) => {
    const oldFloor = socket.data.floor as number | undefined;
    if (oldFloor) {
      socket.leave(`floor:${oldFloor}`);
      socket.to(`floor:${oldFloor}`).emit('player:left', userId);
    }

    socket.data.floor = floor;
    socket.join(`floor:${floor}`);

    await db.update(characters).set({ currentFloor: floor }).where(eq(characters.userId, userId));

    const playerState = await getPlayerState(userId);
    if (playerState) {
      socket.to(`floor:${floor}`).emit('player:joined', playerState);
    }

    const players = await getFloorPlayers(io, floor, userId);
    socket.emit('floor:players', players);

    await incrementProgress(userId, 'visit_floors', io, socket.id);
  });

  socket.on('floor:leave', () => {
    const floor = socket.data.floor as number | undefined;
    if (floor) {
      socket.leave(`floor:${floor}`);
      socket.to(`floor:${floor}`).emit('player:left', userId);
      socket.data.floor = undefined;
    }
  });
}

export async function getPlayerState(userId: number): Promise<PlayerState | null> {
  const [row] = await db
    .select()
    .from(characters)
    .innerJoin(users, eq(characters.userId, users.id))
    .where(eq(characters.userId, userId));

  if (!row) return null;

  return {
    userId,
    nickname: row.users.nickname,
    level: row.users.level,
    gender: row.characters.gender as any,
    appearance: row.characters.appearance as any,
    floor: row.characters.currentFloor,
    x: row.characters.positionX,
    y: row.characters.positionY,
    isSitting: row.characters.isSitting,
    direction: 'down',
  };
}

async function getFloorPlayers(io: Server, floor: number, excludeUserId: number): Promise<PlayerState[]> {
  const sockets = await io.in(`floor:${floor}`).fetchSockets();
  const userIds = sockets
    .map((s) => s.data.userId as number)
    .filter((id) => id !== excludeUserId);

  if (userIds.length === 0) return [];

  // 병렬 쿼리로 모든 플레이어 상태를 동시에 조회
  const results = await Promise.all(userIds.map((id) => getPlayerState(id)));
  return results.filter((s): s is PlayerState => s !== null);
}
