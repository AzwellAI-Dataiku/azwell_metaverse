import { useInventoryStore } from '../../stores/inventoryStore.js';
import { RARITY_COLORS, RARITY_NAMES, MAX_INVENTORY_SLOTS } from '@metaverse/shared';
import type { InventoryItemResponse } from '../../services/api.js';

export default function InventoryModal() {
  const isOpen = useInventoryStore((s) => s.isOpen);
  const close = useInventoryStore((s) => s.closeInventory);
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const equip = useInventoryStore((s) => s.equip);
  const unequip = useInventoryStore((s) => s.unequip);
  const sell = useInventoryStore((s) => s.sell);
  const lastSellGold = useInventoryStore((s) => s.lastSellGold);

  if (!isOpen) return null;

  const equipped = items.filter((i) => i.equipped);
  const unequipped = items.filter((i) => !i.equipped);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel-cy w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-cy-brown">인벤토리</h2>
          <span className="text-xs text-cy-warm-gray">
            {items.length} / {MAX_INVENTORY_SLOTS}
          </span>
        </div>

        {/* 판매 알림 */}
        {lastSellGold !== null && (
          <div className="mx-4 mt-3 px-3 py-2 bg-yellow-50 text-yellow-700 text-xs rounded-lg text-center font-medium">
            +{lastSellGold}G 획득!
          </div>
        )}

        {loading ? (
          <p className="text-center text-cy-warm-gray py-8">로딩 중...</p>
        ) : (
          <>
            {/* 장착 슬롯 */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-cy-brown mb-2">장착 중</h3>
              <div className="grid grid-cols-5 gap-2">
                <EquipSlot label="총" item={equipped.find((i) => i.definition.type === 'weapon')} onUnequip={unequip} />
                <EquipSlot label="칼" item={equipped.find((i) => i.definition.type === 'melee')} onUnequip={unequip} />
                <EquipSlot label="탄약" item={equipped.find((i) => i.definition.type === 'ammo')} onUnequip={unequip} />
                <EquipSlot label="방어구" item={equipped.find((i) => i.definition.type === 'armor')} onUnequip={unequip} />
                <EquipSlot label="물약" item={equipped.find((i) => i.definition.type === 'consumable')} onUnequip={unequip} />
              </div>
            </div>

            {/* 구분선 */}
            <hr className="border-cy-cream mb-4" />

            {/* 인벤토리 그리드 */}
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-cy-brown mb-2">보관함</h3>
              {unequipped.length === 0 ? (
                <p className="text-xs text-cy-warm-gray text-center py-4">
                  보관 중인 아이템이 없습니다
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {unequipped.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEquip={equip}
                      onSell={sell}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EquipSlot({
  label,
  item,
  onUnequip,
}: {
  label: string;
  item?: InventoryItemResponse;
  onUnequip: (id: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-cy bg-cy-cream/50 min-h-[72px]">
      <span className="text-[10px] text-cy-warm-gray">{label}</span>
      {item ? (
        <button
          onClick={() => !item.isDefault && onUnequip(item.id)}
          title={item.isDefault ? '기본 아이템 (해제 불가)' : `${item.definition.name} - 클릭하여 해제`}
          className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform"
        >
          <span className="text-xl">{item.definition.icon}</span>
          <span
            className="text-[9px] font-semibold truncate max-w-[60px]"
            style={{ color: RARITY_COLORS[item.definition.rarity] }}
          >
            {item.definition.name}
          </span>
          {item.isDefault && (
            <span className="text-[8px] bg-gray-200 text-gray-500 px-1 rounded">기본</span>
          )}
          {!item.isDefault && item.durability > 0 && (
            <span className="text-[8px] text-cy-warm-gray">{item.durability}회</span>
          )}
        </button>
      ) : (
        <span className="text-lg text-cy-warm-gray/30">-</span>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onEquip,
  onSell,
}: {
  item: InventoryItemResponse;
  onEquip: (id: number) => void;
  onSell: (id: number, qty?: number) => void;
}) {
  const def = item.definition;
  const rarityColor = RARITY_COLORS[def.rarity];
  const rarityName = RARITY_NAMES[def.rarity];

  return (
    <div
      className="relative flex flex-col items-center gap-0.5 p-2 rounded-cy bg-white border hover:shadow-md transition-shadow cursor-pointer"
      style={{ borderColor: rarityColor + '40' }}
      title={`${def.name} (${rarityName})\n${def.description}`}
    >
      <span className="text-xl">{def.icon}</span>
      <span
        className="text-[9px] font-semibold truncate max-w-[56px]"
        style={{ color: rarityColor }}
      >
        {def.name}
      </span>

      {/* 수량 표시 (stackable) */}
      {item.quantity > 1 && (
        <span className="absolute top-0.5 right-0.5 text-[8px] bg-cy-brown text-white rounded-full w-4 h-4 flex items-center justify-center">
          {item.quantity}
        </span>
      )}

      {/* 내구도 */}
      {!item.isDefault && item.durability > 0 && (
        <span className="text-[8px] text-cy-warm-gray">{item.durability}회</span>
      )}

      {/* 스탯 미리보기 */}
      <div className="text-[8px] text-cy-warm-gray">
        {def.stats.attack && <span>ATK {def.stats.attack} </span>}
        {def.stats.defense && <span>DEF {def.stats.defense} </span>}
        {def.stats.heal && <span>HP +{def.stats.heal}</span>}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-1 mt-0.5">
        <button
          onClick={() => onEquip(item.id)}
          className="text-[8px] bg-cy-brown text-white px-1.5 py-0.5 rounded hover:bg-cy-brown/80"
        >
          장착
        </button>
        {!item.isDefault && def.sellPrice > 0 && (
          <button
            onClick={() => onSell(item.id)}
            className="text-[8px] bg-yellow-500 text-white px-1.5 py-0.5 rounded hover:bg-yellow-600"
          >
            {def.sellPrice}G 판매
          </button>
        )}
      </div>
    </div>
  );
}
