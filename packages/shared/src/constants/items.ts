// ── 아이템 타입 & 등급 ──

export type ItemType = 'weapon' | 'melee' | 'ammo' | 'armor' | 'consumable';
export type ItemRarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'epic';

export interface ItemDefinition {
  id: number;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  stackable: boolean;
  isDefault: boolean;
  /** 매치 단위 내구도. 0 = 무한 (기본 아이템) */
  durability: number;
  stats: ItemStats;
  /** 판매 가격 (골드). 0 = 판매 불가 (기본 아이템) */
  sellPrice: number;
  description: string;
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  heal?: number;
  /** 특수 효과 목록 */
  effects?: string[];
}

// ── 기본 지급 아이템 (영구, 파괴/거래 불가) ──

export const DEFAULT_ITEMS: ItemDefinition[] = [
  {
    id: 1,
    name: '기본 권총',
    type: 'weapon',
    rarity: 'basic',
    icon: '🔫',
    stackable: false,
    isDefault: true,
    durability: 0,
    stats: { attack: 10 },
    sellPrice: 0,
    description: '기본 지급 권총. 파괴되지 않습니다.',
  },
  {
    id: 2,
    name: '기본 탄약',
    type: 'ammo',
    rarity: 'basic',
    icon: '🎯',
    stackable: true,
    isDefault: true,
    durability: 0,
    stats: {},
    sellPrice: 0,
    description: '기본 권총 전용 무제한 탄약.',
  },
  {
    id: 4,
    name: '기본 단검',
    type: 'melee',
    rarity: 'basic',
    icon: '🔪',
    stackable: false,
    isDefault: true,
    durability: 0,
    stats: { attack: 8 },
    sellPrice: 0,
    description: '기본 지급 단검. 파괴되지 않습니다.',
  },
  {
    id: 3,
    name: '기본 조끼',
    type: 'armor',
    rarity: 'basic',
    icon: '🦺',
    stackable: false,
    isDefault: true,
    durability: 0,
    stats: { defense: 5 },
    sellPrice: 0,
    description: '기본 지급 방어구. 파괴되지 않습니다.',
  },
];

// ── 드롭 아이템 카탈로그 ──

// --- 무기 ---
export const DROP_WEAPONS: ItemDefinition[] = [
  // Common
  {
    id: 100,
    name: '구형 리볼버',
    type: 'weapon',
    rarity: 'common',
    icon: '🔫',
    stackable: false,
    isDefault: false,
    durability: 15,
    stats: { attack: 12 },
    sellPrice: 10,
    description: '낡았지만 쓸만한 리볼버.',
  },
  {
    id: 101,
    name: '사냥용 소총',
    type: 'weapon',
    rarity: 'common',
    icon: '🔫',
    stackable: false,
    isDefault: false,
    durability: 15,
    stats: { attack: 15 },
    sellPrice: 10,
    description: '안정적인 사냥용 소총.',
  },
  // Uncommon
  {
    id: 110,
    name: '전투 권총',
    type: 'weapon',
    rarity: 'uncommon',
    icon: '🔫',
    stackable: false,
    isDefault: false,
    durability: 10,
    stats: { attack: 18, effects: ['관통: 방어력 10% 무시'] },
    sellPrice: 25,
    description: '군용 전투 권총. 관통력이 뛰어납니다.',
  },
  {
    id: 111,
    name: '전술 산탄총',
    type: 'weapon',
    rarity: 'uncommon',
    icon: '🔫',
    stackable: false,
    isDefault: false,
    durability: 10,
    stats: { attack: 20, effects: ['산탄: 칼 상대 추가 데미지 +10%'] },
    sellPrice: 25,
    description: '근접 전투에 강한 산탄총.',
  },
  // Rare
  {
    id: 120,
    name: '정밀 저격총',
    type: 'weapon',
    rarity: 'rare',
    icon: '🎯',
    stackable: false,
    isDefault: false,
    durability: 6,
    stats: { attack: 25, effects: ['정밀 사격: 크리티컬 확률 +15%', '관통: 방어력 15% 무시'] },
    sellPrice: 50,
    description: '정밀한 저격으로 적을 제압합니다.',
  },
  {
    id: 121,
    name: '돌격 소총',
    type: 'weapon',
    rarity: 'rare',
    icon: '🔫',
    stackable: false,
    isDefault: false,
    durability: 6,
    stats: { attack: 28, effects: ['연사: 총 공격 시 추가 데미지 +5', '반동 제어: 명중률 보정'] },
    sellPrice: 50,
    description: '높은 연사력의 돌격 소총.',
  },
  // Epic
  {
    id: 130,
    name: '전설의 황금총',
    type: 'weapon',
    rarity: 'epic',
    icon: '⭐',
    stackable: false,
    isDefault: false,
    durability: 3,
    stats: { attack: 35, effects: ['황금탄: 크리티컬 확률 +25%', '관통: 방어력 20% 무시', '위압감: 상대 방어 효과 -10%'] },
    sellPrice: 100,
    description: '전설적인 황금 총. 압도적인 화력.',
  },
  {
    id: 131,
    name: '플라즈마 캐논',
    type: 'weapon',
    rarity: 'epic',
    icon: '💥',
    stackable: false,
    isDefault: false,
    durability: 3,
    stats: { attack: 40, effects: ['에너지파: 범위 데미지 가능', '과열: 2연속 사용 시 공격력 -20%', '충격파: 방어 무시 30%'] },
    sellPrice: 100,
    description: '미래 기술의 에너지 무기. 최강의 화력.',
  },
];

// --- 근접 무기 (칼) ---
export const DROP_MELEE: ItemDefinition[] = [
  {
    id: 200,
    name: '전투 나이프',
    type: 'melee',
    rarity: 'common',
    icon: '🔪',
    stackable: false,
    isDefault: false,
    durability: 15,
    stats: { attack: 14 },
    sellPrice: 10,
    description: '기본적인 전투용 나이프.',
  },
  {
    id: 210,
    name: '전술 단검',
    type: 'melee',
    rarity: 'uncommon',
    icon: '🗡️',
    stackable: false,
    isDefault: false,
    durability: 10,
    stats: { attack: 19, effects: ['속공: 칼 공격 속도 +10%'] },
    sellPrice: 25,
    description: '빠른 공격이 가능한 전술 단검.',
  },
  {
    id: 220,
    name: '강철 대검',
    type: 'melee',
    rarity: 'rare',
    icon: '⚔️',
    stackable: false,
    isDefault: false,
    durability: 6,
    stats: { attack: 26, effects: ['강타: 방어 무시 +20%', '중량감: 추가 데미지 +8'] },
    sellPrice: 50,
    description: '묵직한 일격의 강철 대검.',
  },
  {
    id: 230,
    name: '용의 발톱',
    type: 'melee',
    rarity: 'epic',
    icon: '🐉',
    stackable: false,
    isDefault: false,
    durability: 3,
    stats: { attack: 38, effects: ['용의 기운: 칼 공격 시 HP 흡수 10%', '파멸의 일격: 크리티컬 데미지 +50%', '용린: 피격 시 반격 5% 확률'] },
    sellPrice: 100,
    description: '용의 발톱으로 만든 전설의 무기.',
  },
];

// --- 방어구 ---
export const DROP_ARMORS: ItemDefinition[] = [
  {
    id: 300,
    name: '가죽 조끼',
    type: 'armor',
    rarity: 'common',
    icon: '🧥',
    stackable: false,
    isDefault: false,
    durability: 15,
    stats: { defense: 8 },
    sellPrice: 10,
    description: '가벼운 가죽 방어구.',
  },
  {
    id: 301,
    name: '방탄 조끼',
    type: 'armor',
    rarity: 'common',
    icon: '🦺',
    stackable: false,
    isDefault: false,
    durability: 15,
    stats: { defense: 10 },
    sellPrice: 10,
    description: '총알을 막아주는 방탄 조끼.',
  },
  {
    id: 310,
    name: '강화 전투복',
    type: 'armor',
    rarity: 'uncommon',
    icon: '🛡️',
    stackable: false,
    isDefault: false,
    durability: 10,
    stats: { defense: 14, effects: ['강화 섬유: 칼 데미지 -10%'] },
    sellPrice: 25,
    description: '강화 섬유로 만든 전투복.',
  },
  {
    id: 320,
    name: '티타늄 아머',
    type: 'armor',
    rarity: 'rare',
    icon: '🛡️',
    stackable: false,
    isDefault: false,
    durability: 6,
    stats: { defense: 20, effects: ['티타늄 합금: 총 데미지 -15%', '충격 흡수: 크리티컬 피해 -20%'] },
    sellPrice: 50,
    description: '티타늄 합금으로 제작된 중장갑.',
  },
  {
    id: 330,
    name: '나노 쉴드 아머',
    type: 'armor',
    rarity: 'epic',
    icon: '💎',
    stackable: false,
    isDefault: false,
    durability: 3,
    stats: { defense: 32, effects: ['나노 재생: 매 라운드 HP +3 회복', '에너지 쉴드: 첫 피격 데미지 -30%', '적응형 장갑: 같은 유형 공격 반복 시 추가 방어 +10%'] },
    sellPrice: 100,
    description: '나노 기술로 만든 최첨단 방어구.',
  },
];

// --- 소모품 (물약) ---
export const DROP_CONSUMABLES: ItemDefinition[] = [
  {
    id: 400,
    name: '소형 회복 물약',
    type: 'consumable',
    rarity: 'common',
    icon: '🧪',
    stackable: true,
    isDefault: false,
    durability: 0,
    stats: { heal: 20 },
    sellPrice: 10,
    description: 'HP를 20 회복합니다.',
  },
  {
    id: 410,
    name: '중형 회복 물약',
    type: 'consumable',
    rarity: 'uncommon',
    icon: '🧪',
    stackable: true,
    isDefault: false,
    durability: 0,
    stats: { heal: 40 },
    sellPrice: 25,
    description: 'HP를 40 회복합니다.',
  },
  {
    id: 420,
    name: '대형 회복 물약',
    type: 'consumable',
    rarity: 'rare',
    icon: '💊',
    stackable: true,
    isDefault: false,
    durability: 0,
    stats: { heal: 70 },
    sellPrice: 50,
    description: 'HP를 70 회복합니다.',
  },
  {
    id: 430,
    name: '만능 회복약',
    type: 'consumable',
    rarity: 'epic',
    icon: '✨',
    stackable: true,
    isDefault: false,
    durability: 0,
    stats: { heal: 100, effects: ['전체 회복: HP를 100 회복하고 다음 라운드 방어력 +20%'] },
    sellPrice: 100,
    description: '강력한 회복과 방어 버프를 동시에.',
  },
];

// ── 전체 아이템 목록 ──

export const ALL_ITEMS: ItemDefinition[] = [
  ...DEFAULT_ITEMS,
  ...DROP_WEAPONS,
  ...DROP_MELEE,
  ...DROP_ARMORS,
  ...DROP_CONSUMABLES,
];

export function getItemById(id: number): ItemDefinition | undefined {
  return ALL_ITEMS.find((item) => item.id === id);
}

// ── 드롭 확률 테이블 ──

export const DROP_RATES: Record<ItemRarity, number> = {
  basic: 0,
  common: 0.60,
  uncommon: 0.25,
  rare: 0.12,
  epic: 0.03,
};

// ── 등급별 색상 (UI용) ──

export const RARITY_COLORS: Record<ItemRarity, string> = {
  basic: '#9CA3AF',    // gray
  common: '#FFFFFF',   // white
  uncommon: '#22C55E', // green
  rare: '#3B82F6',     // blue
  epic: '#A855F7',     // purple
};

export const RARITY_NAMES: Record<ItemRarity, string> = {
  basic: '기본',
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  epic: '전설',
};

// ── 인벤토리 상수 ──

export const MAX_INVENTORY_SLOTS = 50;
