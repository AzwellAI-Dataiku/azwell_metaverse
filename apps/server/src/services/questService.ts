import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { questDefinitions, questProgress } from '../db/schema/index.js';
import { DAILY_QUESTS } from '@metaverse/shared';
import { addXp } from './levelService.js';
import { addGold } from './currencyService.js';
import type { Server } from 'socket.io';

export async function getOrCreateDailyQuests(userId: number) {
  const today = sql`CURRENT_DATE`;

  const existing = await db
    .select()
    .from(questProgress)
    .innerJoin(questDefinitions, eq(questProgress.questId, questDefinitions.id))
    .where(and(eq(questProgress.userId, userId), eq(questProgress.date, today)));

  if (existing.length > 0) {
    return existing.map((row) => ({
      ...row.quest_progress,
      quest: row.quest_definitions,
    }));
  }

  const defs = await db.select().from(questDefinitions);
  if (defs.length === 0) {
    await seedQuests();
    return getOrCreateDailyQuests(userId);
  }

  const inserted = await Promise.all(
    defs.map((def) =>
      db.insert(questProgress).values({ userId, questId: def.id }).returning()
    )
  );

  return inserted.map((rows, i) => ({
    ...rows[0],
    quest: defs[i],
  }));
}

export async function incrementProgress(
  userId: number,
  questKey: string,
  io: Server,
  socketId?: string,
) {
  const [def] = await db.select().from(questDefinitions).where(eq(questDefinitions.key, questKey));
  if (!def) return;

  const today = sql`CURRENT_DATE`;
  const [progress] = await db
    .select()
    .from(questProgress)
    .where(
      and(
        eq(questProgress.userId, userId),
        eq(questProgress.questId, def.id),
        eq(questProgress.date, today),
      )
    );

  if (!progress || progress.completed) return;

  const newProgress = progress.progress + 1;
  const completed = newProgress >= def.target;

  await db
    .update(questProgress)
    .set({ progress: newProgress, completed })
    .where(eq(questProgress.id, progress.id));

  const target = socketId || `user:${userId}`;

  io.to(target).emit('quest:progress', {
    ...progress,
    progress: newProgress,
    completed,
    quest: def,
  } as any);

  if (completed) {
    const { leveled, newLevel, goldConverted } = await addXp(userId, def.xpReward);

    const goldReward = def.goldReward ?? 0;
    let totalGoldGained = goldReward + goldConverted;
    if (goldReward > 0) {
      const newGold = await addGold(userId, goldReward);
      io.to(target).emit('currency:changed', { userId, gold: newGold, delta: goldReward });
    }

    io.to(target).emit('quest:completed', { questId: def.id, xpReward: def.xpReward, goldReward: totalGoldGained });
    if (leveled) {
      io.to(target).emit('level:up', { userId, newLevel });
    }
  }
}

async function seedQuests() {
  for (const quest of DAILY_QUESTS) {
    await db
      .insert(questDefinitions)
      .values(quest)
      .onConflictDoNothing({ target: questDefinitions.key });
  }
}
