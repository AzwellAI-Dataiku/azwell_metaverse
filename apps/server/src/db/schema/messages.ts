import { pgTable, serial, integer, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { chatRooms } from './chatRooms.js';

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  roomId: integer('room_id').references(() => chatRooms.id),
  content: text('content').notNull(),
  floor: integer('floor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  floorCreatedIdx: index('idx_messages_floor_created').on(table.floor, table.createdAt),
  roomCreatedIdx: index('idx_messages_room_created').on(table.roomId, table.createdAt),
}));
