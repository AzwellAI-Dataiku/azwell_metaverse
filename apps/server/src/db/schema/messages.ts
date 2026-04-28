import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { chatRooms } from './chatRooms.js';

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  roomId: integer('room_id').references(() => chatRooms.id),
  content: text('content').notNull(),
  floor: integer('floor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
