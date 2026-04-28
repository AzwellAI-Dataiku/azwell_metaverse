import { Router } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { authMiddleware } from './middleware.js';
import { getIO } from '../socket/index.js';
import { getAllPresence, getPresence } from '../socket/presence.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select({ id: users.id, nickname: users.nickname, level: users.level })
      .from(users)
      .orderBy(asc(users.nickname));

    const io = getIO();
    let onlineIds = new Set<number>();
    if (io) {
      const sockets = await io.fetchSockets();
      onlineIds = new Set(sockets.map((s) => s.data.userId as number));
    }

    const presenceMap = getAllPresence();

    res.json(
      rows.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        level: u.level,
        isOnline: onlineIds.has(u.id),
        presence: presenceMap.get(u.id) ?? null,
      }))
    );
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// Locate a user by nickname. Used by commands like /find, /join, /goto.
router.get('/locate', async (req, res) => {
  try {
    const nickname = typeof req.query.nickname === 'string' ? req.query.nickname.trim() : '';
    if (!nickname) {
      res.status(400).json({ error: 'nickname 파라미터가 필요합니다' });
      return;
    }

    const [target] = await db
      .select({ id: users.id, nickname: users.nickname })
      .from(users)
      .where(eq(users.nickname, nickname));

    if (!target) {
      res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
      return;
    }

    const io = getIO();
    let isOnline = false;
    let floor: number | null = null;
    if (io) {
      const sockets = await io.in(`user:${target.id}`).fetchSockets();
      isOnline = sockets.length > 0;
      const withFloor = sockets.find((s) => typeof s.data.floor === 'number');
      floor = withFloor ? (withFloor.data.floor as number) : null;
    }

    res.json({
      userId: target.id,
      nickname: target.nickname,
      isOnline,
      floor,
      presence: getPresence(target.id),
    });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
