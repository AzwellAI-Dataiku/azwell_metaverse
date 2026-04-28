import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 50 }).unique().notNull(),
  level: integer('level').default(1).notNull(),
  xp: integer('xp').default(0).notNull(),
  gold: integer('gold').default(100).notNull(),
  role: varchar('role', { length: 10 }).default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
