import { pgTable, serial, integer, varchar, jsonb, real, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const characters = pgTable('characters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).unique().notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  appearance: jsonb('appearance').notNull(),
  currentFloor: integer('current_floor').default(2).notNull(),
  positionX: real('position_x').default(400).notNull(),
  positionY: real('position_y').default(300).notNull(),
  isSitting: boolean('is_sitting').default(false).notNull(),
});
