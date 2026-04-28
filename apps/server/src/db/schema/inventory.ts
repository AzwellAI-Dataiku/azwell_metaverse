import { pgTable, serial, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const inventoryItems = pgTable('inventory_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  /** 아이템 정의 ID (shared/constants/items.ts의 ItemDefinition.id) */
  itemDefId: integer('item_def_id').notNull(),
  /** 수량 (stackable 아이템용) */
  quantity: integer('quantity').default(1).notNull(),
  /** 남은 내구도 (매치 단위). 0 = 무한 (기본 아이템) */
  durability: integer('durability').default(0).notNull(),
  /** 장착 여부 */
  equipped: boolean('equipped').default(false).notNull(),
  /** 기본 지급 아이템 여부 (파괴/거래 불가) */
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
