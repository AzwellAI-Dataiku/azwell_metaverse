import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters } from '../../db/schema/index.js';

/** 인메모리 위치 캐시 — DB 쓰기를 배치로 처리 */
const positionCache = new Map<number, { x: number; y: number; dirty: boolean }>();

const FLUSH_INTERVAL_MS = 5000;

/** 주기적으로 변경된 위치를 DB에 일괄 저장 */
setInterval(async () => {
  const dirtyEntries: Array<{ userId: number; x: number; y: number }> = [];
  for (const [userId, pos] of positionCache) {
    if (pos.dirty) {
      dirtyEntries.push({ userId, x: pos.x, y: pos.y });
      pos.dirty = false;
    }
  }
  if (dirtyEntries.length === 0) return;

  await Promise.all(
    dirtyEntries.map((e) =>
      db.update(characters)
        .set({ positionX: e.x, positionY: e.y })
        .where(eq(characters.userId, e.userId))
    )
  );
}, FLUSH_INTERVAL_MS);

export function registerMovementHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('player:move', (data) => {
    const { x, y, direction } = data;

    // 인메모리에만 저장 (DB 쓰기 없음)
    positionCache.set(userId, { x, y, dirty: true });

    const floor = socket.data.floor as number;
    socket.to(`floor:${floor}`).emit('player:moved', { userId, x, y, direction });
  });
}

/** 유저 접속 해제 시 캐시에서 즉시 저장 후 제거 */
export async function flushAndRemovePosition(userId: number) {
  const pos = positionCache.get(userId);
  if (pos?.dirty) {
    await db.update(characters)
      .set({ positionX: pos.x, positionY: pos.y })
      .where(eq(characters.userId, userId));
  }
  positionCache.delete(userId);
}
