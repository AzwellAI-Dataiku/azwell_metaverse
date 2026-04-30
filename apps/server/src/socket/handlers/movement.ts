import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters } from '../../db/schema/index.js';

/** 인메모리 위치 캐시 — DB 쓰기를 배치로 처리 */
const positionCache = new Map<number, { x: number; y: number; dirty: boolean }>();

const FLUSH_INTERVAL_MS = 5000;

let flushInProgress = false;

/** 변경된 위치를 DB에 일괄 저장 (동시 실행 방지) */
async function flushDirtyPositions(): Promise<void> {
  if (flushInProgress) return;
  flushInProgress = true;
  try {
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
  } finally {
    flushInProgress = false;
  }
}

const flushTimer: NodeJS.Timeout = setInterval(() => {
  flushDirtyPositions().catch((err) => console.error('position flush failed:', err));
}, FLUSH_INTERVAL_MS);
flushTimer.unref();

/** 외부에서 위치 캐시를 조회 (인메모리 최신값 우선 참조용) */
export function getCachedPosition(userId: number): { x: number; y: number } | null {
  const pos = positionCache.get(userId);
  return pos ? { x: pos.x, y: pos.y } : null;
}

/** 프로세스 종료 시 호출 — interval 중단 + 잔여 dirty 일괄 flush */
export async function shutdownMovementFlusher(): Promise<void> {
  clearInterval(flushTimer);
  await flushDirtyPositions();
}

// Office floor map은 동적 mapData로 정의되어 있어 정확한 경계는 클라마다 다름.
// 명백한 abuse(NaN/Infinity/음수/거대값)만 거부하는 sanity 범위로 사용.
const POSITION_MIN = 0;
const POSITION_MAX = 10_000;

function isValidPosition(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= POSITION_MIN && v <= POSITION_MAX;
}

export function registerMovementHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('player:move', (data) => {
    const { x, y, direction } = data;
    if (!isValidPosition(x) || !isValidPosition(y)) return;

    // 인메모리에만 저장 (DB 쓰기 없음)
    positionCache.set(userId, { x, y, dirty: true });

    const floor = socket.data.floor as number | undefined;
    if (floor === undefined) return;
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
