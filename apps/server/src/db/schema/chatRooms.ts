import { pgTable, serial, varchar, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const chatRooms = pgTable('chat_rooms', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  type: varchar('type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatRoomMembers = pgTable('chat_room_members', {
  roomId: integer('room_id').references(() => chatRooms.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roomId, table.userId] }),
}));
