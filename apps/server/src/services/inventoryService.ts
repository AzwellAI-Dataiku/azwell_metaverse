import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { inventoryItems } from '../db/schema/index.js';
import { DEFAULT_ITEMS, getItemById, MAX_INVENTORY_SLOTS } from '@metaverse/shared';
import type { ItemDefinition } from '@metaverse/shared';

export interface InventoryItem {
  id: number;
  itemDefId: number;
  quantity: number;
  durability: number;
  equipped: boolean;
  isDefault: boolean;
  definition: ItemDefinition;
}

/** 유저 인벤토리 전체 조회. 기본 아이템이 없으면 자동 지급. */
export async function getInventory(userId: number): Promise<InventoryItem[]> {
  const items = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.userId, userId));

  // 기본 아이템 누락 시 자동 보충 (신규 유저 또는 기본 아이템 추가 시)
  const defaultItemIds = new Set(items.filter((i) => i.isDefault).map((i) => i.itemDefId));
  const missingDefaults = DEFAULT_ITEMS.some((d) => !defaultItemIds.has(d.id));
  if (missingDefaults) {
    await grantDefaultItems(userId);
    return getInventory(userId);
  }

  return items.map(toInventoryItem).filter((i): i is InventoryItem => i !== null);
}

/** 기본 아이템 지급 (누락분 자동 보충) */
export async function grantDefaultItems(userId: number): Promise<void> {
  for (const item of DEFAULT_ITEMS) {
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.itemDefId, item.id)));

    if (!existing) {
      await db.insert(inventoryItems).values({
        userId,
        itemDefId: item.id,
        quantity: 1,
        durability: item.durability,
        equipped: true,
        isDefault: true,
      });
    }
  }
}

/** 아이템 장착 */
export async function equipItem(userId: number, inventoryId: number): Promise<{ success: boolean; error?: string }> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, inventoryId), eq(inventoryItems.userId, userId)));

  if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };

  const def = getItemById(item.itemDefId);
  if (!def) return { success: false, error: '아이템 정의를 찾을 수 없습니다' };

  // 같은 타입의 기존 장착 아이템 해제
  const equipped = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.equipped, true)));

  for (const eq_item of equipped) {
    const eq_def = getItemById(eq_item.itemDefId);
    if (eq_def && eq_def.type === def.type && eq_item.id !== inventoryId) {
      await db
        .update(inventoryItems)
        .set({ equipped: false })
        .where(eq(inventoryItems.id, eq_item.id));
    }
  }

  // 대상 아이템 장착
  await db
    .update(inventoryItems)
    .set({ equipped: true })
    .where(eq(inventoryItems.id, inventoryId));

  return { success: true };
}

/** 아이템 장착 해제 */
export async function unequipItem(userId: number, inventoryId: number): Promise<{ success: boolean; error?: string }> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, inventoryId), eq(inventoryItems.userId, userId)));

  if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };
  if (item.isDefault) return { success: false, error: '기본 아이템은 해제할 수 없습니다' };

  await db
    .update(inventoryItems)
    .set({ equipped: false })
    .where(eq(inventoryItems.id, inventoryId));

  return { success: true };
}

/** 아이템 추가 (드롭, 상점 구매 등) */
export async function addItem(
  userId: number,
  itemDefId: number,
  quantity: number = 1,
): Promise<{ success: boolean; error?: string }> {
  const def = getItemById(itemDefId);
  if (!def) return { success: false, error: '아이템 정의를 찾을 수 없습니다' };

  // 인벤토리 슬롯 확인
  const items = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.userId, userId));

  if (def.stackable) {
    // stackable 아이템은 기존 스택에 추가
    const [existing] = await db
      .select()
      .from(inventoryItems)
      .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.itemDefId, itemDefId)));

    if (existing) {
      await db
        .update(inventoryItems)
        .set({ quantity: existing.quantity + quantity })
        .where(eq(inventoryItems.id, existing.id));
      return { success: true };
    }
  }

  // 새 슬롯이 필요한 경우, 슬롯 제한 확인
  if (items.length >= MAX_INVENTORY_SLOTS) {
    return { success: false, error: '인벤토리가 가득 찼습니다. 아이템을 정리해주세요' };
  }

  await db.insert(inventoryItems).values({
    userId,
    itemDefId: itemDefId,
    quantity,
    durability: def.durability,
    equipped: false,
    isDefault: false,
  });

  return { success: true };
}

/** 아이템 삭제 (소모, 파괴) */
export async function removeItem(userId: number, inventoryId: number, quantity: number = 1): Promise<{ success: boolean; error?: string }> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, inventoryId), eq(inventoryItems.userId, userId)));

  if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };
  if (item.isDefault) return { success: false, error: '기본 아이템은 삭제할 수 없습니다' };

  if (item.quantity <= quantity) {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, inventoryId));
  } else {
    await db
      .update(inventoryItems)
      .set({ quantity: item.quantity - quantity })
      .where(eq(inventoryItems.id, inventoryId));
  }

  return { success: true };
}

/** 아이템 판매 (삭제 + 골드 획득) */
export async function sellItem(userId: number, inventoryId: number, quantity: number = 1): Promise<{ success: boolean; error?: string; goldEarned?: number }> {
  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.id, inventoryId), eq(inventoryItems.userId, userId)));

  if (!item) return { success: false, error: '아이템을 찾을 수 없습니다' };
  if (item.isDefault) return { success: false, error: '기본 아이템은 판매할 수 없습니다' };

  const def = getItemById(item.itemDefId);
  if (!def) return { success: false, error: '아이템 정의를 찾을 수 없습니다' };
  if (def.sellPrice <= 0) return { success: false, error: '이 아이템은 판매할 수 없습니다' };

  const sellQty = Math.min(quantity, item.quantity);
  const goldEarned = def.sellPrice * sellQty;

  // 아이템 제거
  if (item.quantity <= sellQty) {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, inventoryId));
  } else {
    await db
      .update(inventoryItems)
      .set({ quantity: item.quantity - sellQty })
      .where(eq(inventoryItems.id, inventoryId));
  }

  // 골드 지급
  const { addGold } = await import('./currencyService.js');
  await addGold(userId, goldEarned);

  return { success: true, goldEarned };
}

/** 내구도 차감 (매치 후 호출) */
export async function reduceDurability(userId: number): Promise<number[]> {
  const equipped = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.equipped, true)));

  const destroyedIds: number[] = [];

  for (const item of equipped) {
    if (item.isDefault || item.durability === 0) continue;

    const newDurability = item.durability - 1;
    if (newDurability <= 0) {
      await db.delete(inventoryItems).where(eq(inventoryItems.id, item.id));
      destroyedIds.push(item.itemDefId);
    } else {
      await db
        .update(inventoryItems)
        .set({ durability: newDurability })
        .where(eq(inventoryItems.id, item.id));
    }
  }

  return destroyedIds;
}

/** 장착 중인 아이템 조회 */
export async function getEquippedItems(userId: number): Promise<InventoryItem[]> {
  const items = await db
    .select()
    .from(inventoryItems)
    .where(and(eq(inventoryItems.userId, userId), eq(inventoryItems.equipped, true)));

  return items.map(toInventoryItem).filter((i): i is InventoryItem => i !== null);
}

function toInventoryItem(row: typeof inventoryItems.$inferSelect): InventoryItem | null {
  const def = getItemById(row.itemDefId);
  if (!def) return null;
  return {
    id: row.id,
    itemDefId: row.itemDefId,
    quantity: row.quantity,
    durability: row.durability,
    equipped: row.equipped,
    isDefault: row.isDefault,
    definition: def,
  };
}
