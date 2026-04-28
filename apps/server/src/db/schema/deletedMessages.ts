import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { messages } from './messages.js';

export const deletedMessages = pgTable(
  'deleted_messages',
  {
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    messageId: integer('message_id')
      .references(() => messages.id)
      .notNull(),
    deletedAt: timestamp('deleted_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.messageId] }),
  })
);
