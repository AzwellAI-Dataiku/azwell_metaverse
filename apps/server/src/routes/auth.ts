import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { config } from '../config.js';
import { authMiddleware } from './middleware.js';
import { getIO } from '../socket/index.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nickname: z.string().min(2).max(20),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateNicknameSchema = z.object({
  nickname: z.string().trim().min(2).max(20),
});

router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const hashed = await bcrypt.hash(body.password, 10);

    const [user] = await db
      .insert(users)
      .values({ email: body.email, password: hashed, nickname: body.nickname })
      .returning({ id: users.id, email: users.email, nickname: users.nickname, level: users.level, xp: users.xp, gold: users.gold, role: users.role, createdAt: users.createdAt });

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });

    const io = getIO();
    if (io) {
      io.emit('user:registered', { id: user.id, nickname: user.nickname, level: user.level });
    }

    res.json({ token, user });
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: '이미 사용 중인 이메일 또는 닉네임입니다' });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });

    const valid = await bcrypt.compare(body.password, user.password);
    if (!valid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });

    const token = jwt.sign({ userId: user.id }, config.JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

router.put('/nickname', authMiddleware, async (req, res) => {
  try {
    const body = updateNicknameSchema.parse(req.body);

    const [updated] = await db
      .update(users)
      .set({ nickname: body.nickname })
      .where(eq(users.id, req.userId!))
      .returning({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        level: users.level,
        xp: users.xp,
        gold: users.gold,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!updated) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    }

    const io = getIO();
    if (io) {
      io.emit('player:nickname-changed', { userId: updated.id, nickname: updated.nickname });
    }

    res.json(updated);
  } catch (err: any) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다' });
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: '서버 오류가 발생했습니다' });
  }
});

export default router;
