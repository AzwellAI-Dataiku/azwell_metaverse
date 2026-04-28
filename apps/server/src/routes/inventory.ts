import { Router } from 'express';
import { authMiddleware } from './middleware.js';
import {
  getInventory,
  equipItem,
  unequipItem,
  removeItem,
  sellItem,
} from '../services/inventoryService.js';

const router = Router();
router.use(authMiddleware);

/** 인벤토리 조회 (기본 아이템 없으면 자동 지급) */
router.get('/', async (req, res) => {
  try {
    const items = await getInventory(req.userId!);
    res.json(items);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

/** 아이템 장착 */
router.post('/equip', async (req, res) => {
  try {
    const { inventoryId } = req.body;
    if (!inventoryId) return res.status(400).json({ error: 'inventoryId가 필요합니다' });

    const result = await equipItem(req.userId!, inventoryId);
    if (!result.success) return res.status(400).json({ error: result.error });

    const items = await getInventory(req.userId!);
    res.json(items);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

/** 아이템 장착 해제 */
router.post('/unequip', async (req, res) => {
  try {
    const { inventoryId } = req.body;
    if (!inventoryId) return res.status(400).json({ error: 'inventoryId가 필요합니다' });

    const result = await unequipItem(req.userId!, inventoryId);
    if (!result.success) return res.status(400).json({ error: result.error });

    const items = await getInventory(req.userId!);
    res.json(items);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

/** 아이템 판매 */
router.post('/sell', async (req, res) => {
  try {
    const { inventoryId, quantity } = req.body;
    if (!inventoryId) return res.status(400).json({ error: 'inventoryId가 필요합니다' });

    const result = await sellItem(req.userId!, inventoryId, quantity ?? 1);
    if (!result.success) return res.status(400).json({ error: result.error });

    const items = await getInventory(req.userId!);
    res.json({ items, goldEarned: result.goldEarned });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
