import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { calcXpForLevel, MAX_LEVEL } from '@metaverse/shared';
import { addGold } from './currencyService.js';

const XP_TO_GOLD_RATE = 10; // 10 XP = 1 gold

export async function addXp(userId: number, amount: number): Promise<{ leveled: boolean; newLevel: number; goldConverted: number }> {
  const [user] = await db.select({ level: users.level, xp: users.xp }).from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');

  let { level, xp } = user;
  let goldConverted = 0;

  if (level >= MAX_LEVEL) {
    goldConverted = Math.floor(amount / XP_TO_GOLD_RATE);
    if (goldConverted > 0) {
      await addGold(userId, goldConverted);
    }
    return { leveled: false, newLevel: level, goldConverted };
  }

  xp += amount;

  let leveled = false;
  while (xp >= calcXpForLevel(level) && level < MAX_LEVEL) {
    xp -= calcXpForLevel(level);
    level++;
    leveled = true;
  }

  if (level >= MAX_LEVEL) {
    goldConverted = Math.floor(xp / XP_TO_GOLD_RATE);
    if (goldConverted > 0) {
      await addGold(userId, goldConverted);
    }
    xp = 0;
  }

  await db.update(users).set({ level, xp }).where(eq(users.id, userId));
  return { leveled, newLevel: level, goldConverted };
}
