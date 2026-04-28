import { Router } from 'express';
import { authMiddleware } from './middleware.js';
import { getOrCreateDailyQuests } from '../services/questService.js';

const router = Router();
router.use(authMiddleware);

router.get('/daily', async (req, res) => {
  try {
    const quests = await getOrCreateDailyQuests(req.userId!);
    res.json(quests);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
