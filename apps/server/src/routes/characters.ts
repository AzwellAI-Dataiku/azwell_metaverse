import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { characters } from '../db/schema/index.js';
import { authMiddleware } from './middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/me', async (req, res) => {
  try {
    const [char] = await db.select().from(characters).where(eq(characters.userId, req.userId!));
    if (!char) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다' });
    res.json(char);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.put('/me', async (req, res) => {
  try {
    const { gender, appearance } = req.body;
    const [existing] = await db.select().from(characters).where(eq(characters.userId, req.userId!));

    if (existing) {
      const [updated] = await db
        .update(characters)
        .set({ gender, appearance })
        .where(eq(characters.userId, req.userId!))
        .returning();
      return res.json(updated);
    }

    const [created] = await db
      .insert(characters)
      .values({ userId: req.userId!, gender, appearance })
      .returning();
    res.status(201).json(created);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
