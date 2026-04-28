import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';

export async function getGold(userId: number): Promise<number> {
  const [user] = await db.select({ gold: users.gold }).from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');
  return user.gold;
}

export async function addGold(userId: number, amount: number): Promise<number> {
  if (amount <= 0) throw new Error('Amount must be positive');
  const [updated] = await db
    .update(users)
    .set({ gold: sql`${users.gold} + ${amount}` })
    .where(eq(users.id, userId))
    .returning({ gold: users.gold });
  if (!updated) throw new Error('User not found');
  return updated.gold;
}

export async function removeGold(userId: number, amount: number): Promise<{ success: boolean; gold: number }> {
  if (amount <= 0) throw new Error('Amount must be positive');

  const [user] = await db.select({ gold: users.gold }).from(users).where(eq(users.id, userId));
  if (!user) throw new Error('User not found');

  if (user.gold < amount) {
    return { success: false, gold: user.gold };
  }

  const [updated] = await db
    .update(users)
    .set({ gold: sql`${users.gold} - ${amount}` })
    .where(eq(users.id, userId))
    .returning({ gold: users.gold });

  return { success: true, gold: updated.gold };
}
