import { randomUUID } from 'crypto';
import {
  DROP_RATES,
  DROP_WEAPONS,
  DROP_MELEE,
  DROP_ARMORS,
  DROP_CONSUMABLES,
  FLOORS,
} from '@metaverse/shared';
import type { ItemDefinition, ItemRarity } from '@metaverse/shared';

// ── 타입 ──

export interface SpawnedBox {
  boxId: string;
  floor: number;
  x: number;  // 타일 좌표
  y: number;
  items: ItemDefinition[];
  spawnedAt: number;
  expireTimer?: ReturnType<typeof setTimeout>;
}

// ── 상수 ──

const SPAWN_INTERVAL_MS = 15 * 60 * 1000;   // 15분
const BOX_EXPIRE_MS = 5 * 60 * 1000;        // 5분
const ANNOUNCE_BEFORE_MS = 2 * 60 * 1000;   // 2분 전 예고
const BOXES_PER_FLOOR = 4;
const MAX_DAILY_PICKUPS = 15;
const ITEMS_PER_BOX = 1;

// 맵 상수 (서버에서는 클라이언트 맵 생성 로직을 참조할 수 없으므로 직접 정의)
const MAP_W = 20;
const MAP_H = 15;

// 걸을 수 없는 타일 위치 (벽, 가구 등)
function getWalkableTiles(floor: number): Array<{ x: number; y: number }> {
  // 벽: 상단 2행, 좌우 1열
  // 가구 위치는 층마다 다르지만 안전한 빈 공간을 계산
  const blocked = new Set<string>();

  // 벽
  for (let x = 0; x < MAP_W; x++) {
    blocked.add(`0,${x}`);
    blocked.add(`1,${x}`);
  }
  for (let y = 0; y < MAP_H; y++) {
    blocked.add(`${y},0`);
    blocked.add(`${y},${MAP_W - 1}`);
  }

  // 문
  blocked.add(`0,${Math.floor(MAP_W / 2)}`);
  blocked.add(`1,${Math.floor(MAP_W / 2)}`);

  // 워크스테이션 + 의자
  const deskRows = floor % 2 === 0 ? [3, 8] : [4, 9];
  for (const row of deskRows) {
    if (row + 2 >= MAP_H - 1) continue;
    for (let x = 2; x < MAP_W - 4; x += 5) {
      blocked.add(`${row},${x}`);
      blocked.add(`${row},${x + 1}`);
      blocked.add(`${row + 1},${x}`);
      blocked.add(`${row + 1},${x + 1}`);
      blocked.add(`${row + 2},${x}`);
      blocked.add(`${row + 2},${x + 1}`);
    }
  }

  // 미팅 구역
  const meetX = floor % 2 === 0 ? 14 : 2;
  const meetY = 12;
  blocked.add(`${meetY},${meetX}`);
  blocked.add(`${meetY},${meetX + 1}`);
  blocked.add(`${meetY},${meetX + 2}`);

  // 화이트보드
  blocked.add(`2,3`);

  // 책장
  blocked.add(`1,${MAP_W - 4}`);
  blocked.add(`2,${MAP_W - 4}`);
  blocked.add(`1,${MAP_W - 5}`);
  blocked.add(`2,${MAP_W - 5}`);

  // 식물
  blocked.add(`2,1`);
  blocked.add(`2,${MAP_W - 2}`);
  blocked.add(`${MAP_H - 2},1`);
  blocked.add(`${MAP_H - 2},${MAP_W - 2}`);
  blocked.add(`6,1`);
  blocked.add(`10,${MAP_W - 2}`);

  // 워터쿨러
  blocked.add(`${MAP_H - 3},${Math.floor(MAP_W / 2)}`);

  const walkable: Array<{ x: number; y: number }> = [];
  for (let y = 2; y < MAP_H; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (!blocked.has(`${y},${x}`)) {
        walkable.push({ x, y });
      }
    }
  }
  return walkable;
}

// ── 루트 테이블 ──

const ALL_DROP_ITEMS: ItemDefinition[] = [
  ...DROP_WEAPONS,
  ...DROP_MELEE,
  ...DROP_ARMORS,
  ...DROP_CONSUMABLES,
];

function rollLoot(): ItemDefinition[] {
  const items: ItemDefinition[] = [];

  for (let i = 0; i < ITEMS_PER_BOX; i++) {
    // 등급 결정
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity: ItemRarity = 'common';

    for (const [rarity, rate] of Object.entries(DROP_RATES) as Array<[ItemRarity, number]>) {
      if (rarity === 'basic') continue;
      cumulative += rate;
      if (roll <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    // 해당 등급에서 랜덤 아이템 선택
    const candidates = ALL_DROP_ITEMS.filter((item) => item.rarity === selectedRarity);
    if (candidates.length > 0) {
      items.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }

  return items;
}

// ── 상태 관리 ──

/** 현재 맵에 존재하는 박스들 */
const activeBoxes = new Map<string, SpawnedBox>();

/** 유저별 일일 픽업 카운트 (날짜별 리셋) */
const dailyPickups = new Map<string, { date: string; count: number }>();

let spawnTimer: ReturnType<typeof setInterval> | null = null;
let announceTimer: ReturnType<typeof setTimeout> | null = null;

function getDailyKey(userId: number): string {
  return `${userId}`;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getUserDailyCount(userId: number): number {
  const key = getDailyKey(userId);
  const entry = dailyPickups.get(key);
  if (!entry || entry.date !== getTodayStr()) return 0;
  return entry.count;
}

function incrementDailyCount(userId: number): void {
  const key = getDailyKey(userId);
  const today = getTodayStr();
  const entry = dailyPickups.get(key);
  if (!entry || entry.date !== today) {
    dailyPickups.set(key, { date: today, count: 1 });
  } else {
    entry.count++;
  }
}

// ── 스폰 로직 ──

export type BoxEventHandler = {
  onSpawn: (box: SpawnedBox) => void;
  onExpire: (boxId: string, floor: number) => void;
  onAnnounce: (floor: number, secondsUntil: number) => void;
};

let eventHandler: BoxEventHandler | null = null;

export function setBoxEventHandler(handler: BoxEventHandler): void {
  eventHandler = handler;
}

function spawnBoxes(): void {
  for (const floor of FLOORS) {
    const walkable = getWalkableTiles(floor.id);
    const shuffled = walkable.sort(() => Math.random() - 0.5);
    const count = Math.min(BOXES_PER_FLOOR, shuffled.length);

    for (let i = 0; i < count; i++) {
      const pos = shuffled[i];
      const box: SpawnedBox = {
        boxId: randomUUID(),
        floor: floor.id,
        x: pos.x,
        y: pos.y,
        items: rollLoot(),
        spawnedAt: Date.now(),
      };

      // 5분 후 만료
      box.expireTimer = setTimeout(() => {
        activeBoxes.delete(box.boxId);
        eventHandler?.onExpire(box.boxId, box.floor);
      }, BOX_EXPIRE_MS);

      activeBoxes.set(box.boxId, box);
      eventHandler?.onSpawn(box);
    }
  }
}

export function startItemBoxSpawner(): void {
  // 서버 시작 시 첫 스폰
  spawnBoxes();

  // 15분 간격 반복 스폰
  spawnTimer = setInterval(() => {
    spawnBoxes();
  }, SPAWN_INTERVAL_MS);

  // 스폰 2분 전 예고 (13분 후)
  function scheduleAnnounce() {
    announceTimer = setTimeout(() => {
      for (const floor of FLOORS) {
        eventHandler?.onAnnounce(floor.id, 120);
      }
      scheduleAnnounce();
    }, SPAWN_INTERVAL_MS - ANNOUNCE_BEFORE_MS);
  }
  // 첫 예고는 13분 후
  setTimeout(scheduleAnnounce, SPAWN_INTERVAL_MS - ANNOUNCE_BEFORE_MS);
}

export function stopItemBoxSpawner(): void {
  if (spawnTimer) clearInterval(spawnTimer);
  if (announceTimer) clearTimeout(announceTimer);

  // 만료 타이머 전부 정리
  for (const box of activeBoxes.values()) {
    if (box.expireTimer) clearTimeout(box.expireTimer);
  }
  activeBoxes.clear();
}

// ── 픽업 ──

export interface PickupResult {
  success: boolean;
  error?: string;
  items?: ItemDefinition[];
}

export function pickupBox(userId: number, boxId: string): PickupResult {
  const box = activeBoxes.get(boxId);
  if (!box) {
    return { success: false, error: '박스가 이미 사라졌습니다' };
  }

  // 일일 상한 확인
  if (getUserDailyCount(userId) >= MAX_DAILY_PICKUPS) {
    return { success: false, error: '오늘의 아이템 박스 획득 한도에 도달했습니다' };
  }

  // 박스 제거
  if (box.expireTimer) clearTimeout(box.expireTimer);
  activeBoxes.delete(boxId);
  incrementDailyCount(userId);

  return { success: true, items: box.items };
}

/** 특정 층의 현재 활성 박스 목록 조회 */
export function getActiveBoxes(floor: number): SpawnedBox[] {
  return Array.from(activeBoxes.values()).filter((b) => b.floor === floor);
}
