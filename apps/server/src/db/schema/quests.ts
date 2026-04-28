import { pgTable, serial, varchar, integer, text, boolean, date } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const questDefinitions = pgTable('quest_definitions', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).unique().notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  target: integer('target').notNull(),
  xpReward: integer('xp_reward').notNull(),
  goldReward: integer('gold_reward').default(0).notNull(),
});

export const questProgress = pgTable('quest_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  questId: integer('quest_id').references(() => questDefinitions.id).notNull(),
  progress: integer('progress').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  date: date('date').default(sql`CURRENT_DATE`).notNull(),
});
