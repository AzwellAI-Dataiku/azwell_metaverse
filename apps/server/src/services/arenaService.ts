import { randomUUID } from 'crypto';
import { db } from '../db/index.js';
import { arenaMatches, arenaParticipants } from '../db/schema/index.js';
import { removeGold, addGold } from './currencyService.js';
import { getEquippedItems, reduceDurability } from './inventoryService.js';
import { addXp } from './levelService.js';
import {
  ARENA_MODES,
  MATCH_COUNTDOWN_SECONDS,
  READY_CHECK_SECONDS,
  RECONNECT_TIMEOUT_SECONDS,
  MATCH_DURATION_SECONDS,
  SERVER_TICK_MS,
  SHOOT_COOLDOWN_MS,
  RUSH_COOLDOWN_MS,
  DEFEND_COOLDOWN_MS,
  DEFEND_DURATION_MS,
  DEFEND_DAMAGE_REDUCTION,
  MAX_POTION_PER_MATCH,
  POTION_HEAL_RATIO,
  BULLET_SPEED,
  BULLET_RANGE,
  BULLET_SIZE,
  SLASH_RANGE,
  SLASH_ARC_DEG,
  SLASH_DAMAGE_MULT,
  ARENA_MAP_W,
  ARENA_MAP_H,
  PLAYER_SIZE,
  calcCombatHp,
  getArenaRankTier,
  CROSS_TIER_HP_BONUS,
  FFA_PRIZE_RATIOS,
  TEAM_PRIZE_RATIOS,
} from '@metaverse/shared';
import type {
  ArenaMode,
  CombatAction,
  ArenaRankTier,
  Gender,
  CharacterAppearance,
} from '@metaverse/shared';
import type {
  ArenaMatch,
  ArenaParticipant,
  Direction8,
  MatchState,
  QueueEntry,
  MatchEndResult,
  MatchReward,
  Projectile,
  ArenaTickData,
} from '@metaverse/shared';

// ── 이벤트 핸들러 ──

export type ArenaEventHandler = {
  onQueueUpdate: (mode: ArenaMode, count: number) => void;
  onMatchFound: (match: ArenaMatch) => void;
  onCountdown: (matchId: string, secondsLeft: number) => void;
  onReadyCheck: (matchId: string, deadline: number) => void;
  onReadyStatus: (matchId: string, userId: number, ready: boolean) => void;
  onMatchStart: (matchId: string) => void;
  onTick: (matchId: string, data: ArenaTickData) => void;
  onDamage: (matchId: string, attackerId: number, targetId: number, damage: number, action: CombatAction, targetHpAfter: number, killed: boolean) => void;
  onHeal: (matchId: string, userId: number, amount: number, hpAfter: number) => void;
  onKill: (matchId: string, killerId: number, victimId: number, action: string) => void;
  onMatchEnd: (matchId: string, result: MatchEndResult) => void;
  onPlayerDisconnected: (matchId: string, userId: number) => void;
  onPlayerReconnected: (matchId: string, userId: number) => void;
  onError: (userId: number, message: string) => void;
};

let eventHandler: ArenaEventHandler | null = null;

export function setArenaEventHandler(handler: ArenaEventHandler): void {
  eventHandler = handler;
}

// ── 상태 관리 ──

const queues = new Map<ArenaMode, QueueEntry[]>();
queues.set('ffa', []);
queues.set('team_2v2', []);
queues.set('team_3v3', []);

const activeMatches = new Map<string, ArenaMatch>();
const userMatchMap = new Map<number, string>();
const matchTimers = new Map<string, ReturnType<typeof setInterval>>();
const reconnectTimers = new Map<number, ReturnType<typeof setTimeout>>();
const countdownTimers = new Map<ArenaMode, ReturnType<typeof setInterval>>();

/** 유저별 킬 수 추적 */
const killCounts = new Map<string, Map<number, number>>(); // matchId → userId → kills
/** 유저별 총 데미지 추적 */
const damageDealt = new Map<string, Map<number, number>>();
const damageTaken = new Map<string, Map<number, number>>();
/** 사망 순서 추적 (먼저 죽을수록 값이 작음) */
const deathOrder = new Map<string, Map<number, number>>(); // matchId → userId → order

// ── 대기열 ──

export async function joinQueue(
  userId: number,
  nickname: string,
  level: number,
  mode: ArenaMode,
  gender: Gender,
  appearance: CharacterAppearance,
): Promise<{ success: boolean; error?: string }> {
  if (userMatchMap.has(userId)) {
    return { success: false, error: '이미 매치에 참가 중입니다' };
  }

  for (const [, queue] of queues) {
    if (queue.some((e) => e.userId === userId)) {
      return { success: false, error: '이미 대기열에 등록되어 있습니다' };
    }
  }

  const modeConfig = ARENA_MODES[mode];
  const result = await removeGold(userId, modeConfig.entryFee);
  if (!result.success) {
    return { success: false, error: '골드가 부족합니다' };
  }

  const queue = queues.get(mode)!;
  queue.push({
    userId, nickname, level,
    tier: getArenaRankTier(level),
    gender, appearance,
    mode, joinedAt: Date.now(),
  });

  eventHandler?.onQueueUpdate(mode, queue.length);
  tryMatch(mode);
  return { success: true };
}

export async function leaveQueue(userId: number): Promise<void> {
  for (const [mode, queue] of queues) {
    const idx = queue.findIndex((e) => e.userId === userId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      await addGold(userId, ARENA_MODES[mode].entryFee);
      eventHandler?.onQueueUpdate(mode, queue.length);
      return;
    }
  }
}

// ── 매칭 ──

function tryMatch(mode: ArenaMode): void {
  // 인원 충족 시 대기열 업데이트만 전송 (자동 시작 없음, 유저가 시작 버튼 클릭)
  const queue = queues.get(mode)!;
  eventHandler?.onQueueUpdate(mode, queue.length);
}

/** 유저가 시작 버튼을 클릭했을 때 호출 */
export async function handleStartFromQueue(userId: number, mode: ArenaMode): Promise<void> {
  const queue = queues.get(mode);
  if (!queue) return;

  // 요청한 유저가 대기열에 있는지 확인
  if (!queue.some((e) => e.userId === userId)) return;

  const config = ARENA_MODES[mode];
  if (queue.length < config.minPlayers) {
    eventHandler?.onError(userId, '아직 인원이 부족합니다');
    return;
  }

  await createMatch(mode);
}

async function createMatch(mode: ArenaMode): Promise<void> {
  const queue = queues.get(mode)!;
  const config = ARENA_MODES[mode];
  if (queue.length < config.minPlayers) return;

  const taken = queue.splice(0, Math.min(queue.length, config.maxPlayers));
  eventHandler?.onQueueUpdate(mode, queue.length);

  const matchId = randomUUID();
  const prizePool = taken.length * config.entryFee;

  // 스폰 위치 계산
  const spawnPositions = getSpawnPositions(taken.length);

  const participants: ArenaParticipant[] = [];
  for (let i = 0; i < taken.length; i++) {
    const entry = taken[i];
    const equipped = await getEquippedItems(entry.userId);
    let attack = 10;
    let defense = 5;
    for (const item of equipped) {
      if (item.definition.stats) {
        if (item.definition.stats.attack) attack = Math.max(attack, item.definition.stats.attack);
        if (item.definition.stats.defense) defense = Math.max(defense, item.definition.stats.defense);
      }
    }
    const hp = calcCombatHp(entry.level, defense);
    const spawn = spawnPositions[i];

    participants.push({
      userId: entry.userId,
      nickname: entry.nickname,
      level: entry.level,
      tier: entry.tier,
      gender: entry.gender,
      appearance: entry.appearance,
      team: 0,
      hp, maxHp: hp, attack, defense,
      alive: true, connected: true,
      x: spawn.x, y: spawn.y,
      direction: 'down',
      potionUsesLeft: MAX_POTION_PER_MATCH,
      lastShootAt: 0, lastRushAt: 0, lastDefendAt: 0,
      defendingUntil: 0,
    });
  }

  if (config.teamCount === 2) assignTeams(participants);
  applyCrossTierBonus(participants);

  // 통계 초기화
  const kills = new Map<number, number>();
  const dealt = new Map<number, number>();
  const received = new Map<number, number>();
  for (const p of participants) {
    kills.set(p.userId, 0);
    dealt.set(p.userId, 0);
    received.set(p.userId, 0);
  }
  killCounts.set(matchId, kills);
  damageDealt.set(matchId, dealt);
  damageTaken.set(matchId, received);
  deathOrder.set(matchId, new Map());

  const match: ArenaMatch = {
    matchId, mode,
    state: config.teamCount > 0 ? 'ready_check' : 'countdown',
    participants,
    projectiles: [],
    prizePool,
    matchDuration: MATCH_DURATION_SECONDS,
    startedAt: 0,
    createdAt: Date.now(),
  };

  activeMatches.set(matchId, match);
  for (const p of participants) userMatchMap.set(p.userId, matchId);

  eventHandler?.onMatchFound(match);

  if (config.teamCount > 0) {
    const deadline = Date.now() + READY_CHECK_SECONDS * 1000;
    eventHandler?.onReadyCheck(matchId, deadline);
    matchTimers.set(matchId, setTimeout(() => {
      handleReadyCheckTimeout(matchId);
    }, READY_CHECK_SECONDS * 1000) as any);
  } else {
    // FFA: 즉시 시작
    startMatch(matchId);
  }
}

function getSpawnPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const cx = ARENA_MAP_W / 2;
  const cy = ARENA_MAP_H / 2;
  const radius = Math.min(ARENA_MAP_W, ARENA_MAP_H) * 0.35;

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push({
      x: Math.round(cx + radius * Math.cos(angle)),
      y: Math.round(cy + radius * Math.sin(angle)),
    });
  }
  return positions;
}

function assignTeams(participants: ArenaParticipant[]): void {
  const sorted = [...participants].sort((a, b) => (b.attack + b.defense) - (a.attack + a.defense));
  for (let i = 0; i < sorted.length; i++) {
    const p = participants.find((pp) => pp.userId === sorted[i].userId)!;
    p.team = i % 2 === 0 ? 1 : 2;
  }
}

function applyCrossTierBonus(participants: ArenaParticipant[]): void {
  const tiers = new Set(participants.map((p) => p.tier));
  if (tiers.size <= 1) return;
  const tierOrder: ArenaRankTier[] = ['bronze', 'silver', 'gold'];
  const maxTierIdx = Math.max(...participants.map((p) => tierOrder.indexOf(p.tier)));
  for (const p of participants) {
    if (tierOrder.indexOf(p.tier) < maxTierIdx) {
      const bonus = Math.floor(p.maxHp * CROSS_TIER_HP_BONUS);
      p.hp += bonus;
      p.maxHp += bonus;
    }
  }
}

// ── 레디 체크 ──

const readyMap = new Map<string, Set<number>>();

export function setReady(userId: number, matchId: string, ready: boolean): void {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== 'ready_check') return;

  if (!readyMap.has(matchId)) readyMap.set(matchId, new Set());
  const readySet = readyMap.get(matchId)!;
  if (ready) readySet.add(userId); else readySet.delete(userId);
  eventHandler?.onReadyStatus(matchId, userId, ready);

  if (readySet.size === match.participants.length) {
    clearMatchTimer(matchId);
    readyMap.delete(matchId);
    startMatch(matchId);
  }
}

function handleReadyCheckTimeout(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== 'ready_check') return;
  const readySet = readyMap.get(matchId) || new Set();

  for (const p of match.participants) {
    userMatchMap.delete(p.userId);
    addGold(p.userId, ARENA_MODES[match.mode].entryFee);
    if (readySet.has(p.userId)) {
      eventHandler?.onError(p.userId, '레디 체크 실패 — 참가비가 환불되었습니다');
    }
  }
  activeMatches.delete(matchId);
  readyMap.delete(matchId);
  cleanupMatchStats(matchId);
}

// ── 매치 시작 + 게임 루프 ──

function startMatch(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.state = 'fighting';
  match.startedAt = Date.now();
  eventHandler?.onMatchStart(matchId);

  // 서버 틱 루프 시작
  const tickInterval = setInterval(() => {
    gameTick(matchId);
  }, SERVER_TICK_MS);

  matchTimers.set(matchId, tickInterval);
}

function gameTick(matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== 'fighting') return;

  const now = Date.now();

  // 방어 상태 만료
  for (const p of match.participants) {
    if (p.defendingUntil > 0 && now >= p.defendingUntil) {
      p.defendingUntil = 0;
    }
  }

  // 투사체 이동 + 충돌 판정
  updateProjectiles(match, now);

  // 제한시간 체크
  const elapsed = (now - match.startedAt) / 1000;
  const timeLeft = Math.max(0, match.matchDuration - elapsed);

  // 매치 종료 조건
  const alive = match.participants.filter((p) => p.alive);
  let shouldEnd = false;

  if (timeLeft <= 0) shouldEnd = true;
  else if (match.mode === 'ffa' && alive.length <= 1) shouldEnd = true;
  else if (match.mode !== 'ffa') {
    const t1 = alive.filter((p) => p.team === 1).length;
    const t2 = alive.filter((p) => p.team === 2).length;
    if (t1 === 0 || t2 === 0) shouldEnd = true;
  }

  if (shouldEnd) {
    endMatch(matchId);
    return;
  }

  // 틱 데이터 브로드캐스트
  const tickData: ArenaTickData = {
    matchId,
    timeLeft: Math.round(timeLeft),
    players: match.participants.map((p) => ({
      userId: p.userId,
      x: p.x, y: p.y,
      hp: p.hp, maxHp: p.maxHp,
      alive: p.alive,
      direction: p.direction,
      defending: p.defendingUntil > now,
    })),
    projectiles: match.projectiles.map((pr) => ({
      id: pr.id, ownerId: pr.ownerId, type: pr.type,
      x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy,
    })),
  };

  eventHandler?.onTick(matchId, tickData);
}

function updateProjectiles(match: ArenaMatch, now: number): void {
  const dt = SERVER_TICK_MS / 1000;
  const toRemove = new Set<string>();
  const bulletMaxAge = BULLET_RANGE / BULLET_SPEED;
  const hitDist = PLAYER_SIZE + BULLET_SIZE;
  const hitDistSq = hitDist * hitDist;

  // 참가자 인덱스 (매 틱 재생성하지 않도록 캐싱)
  const participantMap = new Map<number, ArenaParticipant>();
  for (const p of match.participants) participantMap.set(p.userId, p);

  // 생존 타겟만 필터 (충돌 판정용)
  const aliveTargets = match.participants.filter((p) => p.alive);

  // 통계 맵 캐싱
  const dealt = damageDealt.get(match.matchId);
  const taken = damageTaken.get(match.matchId);
  const kills = killCounts.get(match.matchId);
  const isFfa = match.mode === 'ffa';

  for (const proj of match.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    // 맵 밖 → 제거
    if (proj.x < 0 || proj.x > ARENA_MAP_W || proj.y < 0 || proj.y > ARENA_MAP_H) {
      toRemove.add(proj.id);
      continue;
    }

    // 사거리 초과 → 제거
    const age = (now - proj.createdAt) / 1000;
    if (proj.type === 'bullet' && age > bulletMaxAge) {
      toRemove.add(proj.id);
      continue;
    }
    if (proj.type === 'slash' && age > 0.15) {
      toRemove.add(proj.id);
      continue;
    }

    // 오너 정보 (루프 밖에서 1회 조회)
    const owner = participantMap.get(proj.ownerId);
    const ownerTeam = owner?.team ?? 0;

    // 플레이어 충돌 판정
    for (const target of aliveTargets) {
      if (target.userId === proj.ownerId) continue;
      if (!isFfa && ownerTeam === target.team && ownerTeam > 0) continue;

      const dx = proj.x - target.x;
      const dy = proj.y - target.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < hitDistSq) {
        let damage = owner ? owner.attack : 10;
        if (proj.type === 'slash') damage = Math.floor(damage * SLASH_DAMAGE_MULT);

        if (target.defendingUntil > now && proj.type === 'bullet') {
          damage = Math.floor(damage * DEFEND_DAMAGE_REDUCTION);
        }

        target.hp = Math.max(0, target.hp - damage);

        dealt?.set(proj.ownerId, (dealt.get(proj.ownerId) ?? 0) + damage);
        taken?.set(target.userId, (taken.get(target.userId) ?? 0) + damage);

        const killed = target.hp <= 0;
        if (killed) {
          target.alive = false;
          kills?.set(proj.ownerId, (kills.get(proj.ownerId) ?? 0) + 1);
          const order = deathOrder.get(match.matchId);
          if (order) order.set(target.userId, order.size + 1);
          eventHandler?.onKill(match.matchId, proj.ownerId, target.userId, proj.type === 'bullet' ? 'shoot' : 'rush');
        }

        eventHandler?.onDamage(match.matchId, proj.ownerId, target.userId, damage, proj.type === 'bullet' ? 'shoot' : 'rush', target.hp, killed);
        toRemove.add(proj.id);
        break;
      }
    }
  }

  if (toRemove.size > 0) {
    match.projectiles = match.projectiles.filter((p) => !toRemove.has(p.id));
  }
}

// ── 매치 시작 요청 ──

export function handleStartMatch(userId: number, matchId: string): void {
  const match = activeMatches.get(matchId);
  if (!match) return;
  if (match.state !== 'countdown') return;

  // 참가자인지 확인
  const p = match.participants.find((pp) => pp.userId === userId);
  if (!p) return;

  startMatch(matchId);
}

// ── 플레이어 입력 처리 ──

export function handleMove(userId: number, matchId: string, x: number, y: number, direction: Direction8): void {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== 'fighting') return;

  const p = match.participants.find((pp) => pp.userId === userId);
  if (!p || !p.alive) return;

  // 맵 범위 클램프
  p.x = Math.max(PLAYER_SIZE, Math.min(ARENA_MAP_W - PLAYER_SIZE, x));
  p.y = Math.max(PLAYER_SIZE, Math.min(ARENA_MAP_H - PLAYER_SIZE, y));
  p.direction = direction;
}

export function handleSkill(userId: number, matchId: string, action: CombatAction, targetX?: number, targetY?: number): void {
  const match = activeMatches.get(matchId);
  if (!match || match.state !== 'fighting') return;

  const p = match.participants.find((pp) => pp.userId === userId);
  if (!p || !p.alive) return;

  const now = Date.now();

  switch (action) {
    case 'shoot': {
      if (now - p.lastShootAt < SHOOT_COOLDOWN_MS) return;
      p.lastShootAt = now;

      // 방향 계산
      let vx = 0, vy = 0;
      if (targetX !== undefined && targetY !== undefined) {
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        vx = (dx / len) * BULLET_SPEED;
        vy = (dy / len) * BULLET_SPEED;
      } else {
        // 바라보는 방향으로 발사
        const d = Math.SQRT1_2;
        const dirs: Record<Direction8, [number, number]> = {
          up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
          'up-left': [-d, -d], 'up-right': [d, -d], 'down-left': [-d, d], 'down-right': [d, d],
        };
        const [dx, dy] = dirs[p.direction];
        vx = dx * BULLET_SPEED;
        vy = dy * BULLET_SPEED;
      }

      match.projectiles.push({
        id: randomUUID(),
        ownerId: userId,
        type: 'bullet',
        x: p.x, y: p.y,
        vx, vy,
        damage: p.attack,
        createdAt: now,
      });
      break;
    }

    case 'rush': {
      if (now - p.lastRushAt < RUSH_COOLDOWN_MS) return;
      p.lastRushAt = now;

      // 근접 부채꼴 공격 — 범위 내 적에게 즉시 데미지
      const dirAngles: Record<Direction8, number> = {
        right: 0, 'up-right': -Math.PI / 4, up: -Math.PI / 2, 'up-left': -3 * Math.PI / 4,
        left: Math.PI, 'down-left': 3 * Math.PI / 4, down: Math.PI / 2, 'down-right': Math.PI / 4,
      };
      const facingAngle = dirAngles[p.direction];
      const halfArc = (SLASH_ARC_DEG / 2) * (Math.PI / 180);

      for (const target of match.participants) {
        if (!target.alive || target.userId === userId) continue;
        if (match.mode !== 'ffa') {
          if (p.team === target.team && p.team > 0) continue;
        }

        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > SLASH_RANGE) continue;

        const angle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angle - facingAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= halfArc) {
          let damage = Math.floor(p.attack * SLASH_DAMAGE_MULT);
          // 칼은 방어 무시

          target.hp = Math.max(0, target.hp - damage);

          damageDealt.get(match.matchId)?.set(userId, (damageDealt.get(match.matchId)?.get(userId) ?? 0) + damage);
          damageTaken.get(match.matchId)?.set(target.userId, (damageTaken.get(match.matchId)?.get(target.userId) ?? 0) + damage);

          const killed = target.hp <= 0;
          if (killed) {
            target.alive = false;
            const kills = killCounts.get(match.matchId);
            if (kills) kills.set(userId, (kills.get(userId) ?? 0) + 1);
            const order = deathOrder.get(match.matchId);
            if (order) order.set(target.userId, order.size + 1);
            eventHandler?.onKill(match.matchId, userId, target.userId, 'rush');
          }

          eventHandler?.onDamage(match.matchId, userId, target.userId, damage, 'rush', target.hp, killed);
        }
      }
      break;
    }

    case 'defend': {
      if (now - p.lastDefendAt < DEFEND_COOLDOWN_MS) return;
      p.lastDefendAt = now;
      p.defendingUntil = now + DEFEND_DURATION_MS;
      break;
    }

    case 'potion': {
      if (p.potionUsesLeft <= 0) {
        eventHandler?.onError(userId, '물약 사용 횟수를 초과했습니다');
        return;
      }
      p.potionUsesLeft--;
      const healAmount = Math.floor(p.maxHp * POTION_HEAL_RATIO);
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      eventHandler?.onHeal(match.matchId, userId, healAmount, p.hp);
      break;
    }
  }
}

// ── 매치 종료 ──

async function endMatch(matchId: string): Promise<void> {
  const match = activeMatches.get(matchId);
  if (!match) return;

  match.state = 'match_end';
  clearMatchTimer(matchId);

  const rewards = calculateRewards(match);
  const alive = match.participants.filter((p) => p.alive);
  const isDraw = match.mode === 'ffa' ? alive.length !== 1 : false;
  const winnerTeam = match.mode !== 'ffa' && alive.length > 0 ? alive[0].team : undefined;

  try {
    await db.insert(arenaMatches).values({
      matchId, mode: match.mode, state: 'match_end',
      floor: 2, round: 0, maxRounds: 0,
      prizePool: match.prizePool,
      winnerTeam: winnerTeam ?? null,
      isDraw,
      roundsData: '[]',
      endedAt: new Date(),
    });

    for (const r of rewards) {
      await db.insert(arenaParticipants).values({
        matchId,
        userId: r.userId,
        team: match.participants.find((p) => p.userId === r.userId)?.team ?? 0,
        rank: r.rank,
        goldEarned: r.goldEarned,
        xpEarned: r.xpEarned,
        totalDamageDealt: r.totalDamageDealt,
        totalDamageTaken: r.totalDamageTaken,
        roundsSurvived: 0,
        isMvp: r.isMvp,
      });
      if (r.goldEarned > 0) await addGold(r.userId, r.goldEarned);
      if (r.xpEarned > 0) await addXp(r.userId, r.xpEarned);
    }

    for (const p of match.participants) {
      await reduceDurability(p.userId);
    }
  } catch (err) {
    console.error('Failed to save match results:', err);
  }

  const result: MatchEndResult = { matchId, mode: match.mode, rewards, winnerTeam, isDraw };
  eventHandler?.onMatchEnd(matchId, result);

  setTimeout(() => {
    for (const p of match.participants) userMatchMap.delete(p.userId);
    activeMatches.delete(matchId);
    cleanupMatchStats(matchId);
  }, 5000);
}

function calculateRewards(match: ArenaMatch): MatchReward[] {
  const rewards: MatchReward[] = [];
  const kills = killCounts.get(match.matchId) || new Map();
  const dealt = damageDealt.get(match.matchId) || new Map();
  const received = damageTaken.get(match.matchId) || new Map();

  const mvpUserId = [...(dealt.entries())].reduce((best, [uid, dmg]) =>
    dmg > (best[1] || 0) ? [uid, dmg] : best, [0, 0] as [number, number]
  )[0];

  if (match.mode === 'ffa') {
    // 순위: 살아남은 사람 1위, 나머지는 늦게 죽을수록 높은 순위
    const alive = match.participants.filter((p) => p.alive);
    const order = deathOrder.get(match.matchId) || new Map();
    const dead = match.participants.filter((p) => !p.alive)
      .sort((a, b) => (order.get(b.userId) ?? 0) - (order.get(a.userId) ?? 0));
    const ranked = [...alive, ...dead];

    for (let i = 0; i < ranked.length; i++) {
      const p = ranked[i];
      const rank = i + 1;
      const prizeRatio = FFA_PRIZE_RATIOS[i] ?? 0;
      rewards.push({
        userId: p.userId, rank,
        goldEarned: Math.floor(match.prizePool * prizeRatio),
        xpEarned: Math.max(30 - (rank - 1) * 10, 5),
        isMvp: p.userId === mvpUserId,
        totalDamageDealt: dealt.get(p.userId) ?? 0,
        totalDamageTaken: received.get(p.userId) ?? 0,
        kills: kills.get(p.userId) ?? 0,
      });
    }
  } else {
    const alive = match.participants.filter((p) => p.alive);
    const winnerTeam = alive.length > 0 ? alive[0].team : 1;
    const totalWinners = TEAM_PRIZE_RATIOS.winners * match.prizePool;
    const totalLosers = TEAM_PRIZE_RATIOS.losers * match.prizePool;

    const winners = match.participants.filter((p) => p.team === winnerTeam);
    const losers = match.participants.filter((p) => p.team !== winnerTeam);
    const perWinner = Math.floor(totalWinners / (winners.length || 1));
    const perLoser = Math.floor(totalLosers / (losers.length || 1));

    for (const p of winners) {
      rewards.push({
        userId: p.userId, rank: 1,
        goldEarned: perWinner, xpEarned: 30,
        isMvp: p.userId === mvpUserId,
        totalDamageDealt: dealt.get(p.userId) ?? 0,
        totalDamageTaken: received.get(p.userId) ?? 0,
        kills: kills.get(p.userId) ?? 0,
      });
    }
    for (const p of losers) {
      rewards.push({
        userId: p.userId, rank: 2,
        goldEarned: perLoser, xpEarned: 10,
        isMvp: p.userId === mvpUserId,
        totalDamageDealt: dealt.get(p.userId) ?? 0,
        totalDamageTaken: received.get(p.userId) ?? 0,
        kills: kills.get(p.userId) ?? 0,
      });
    }
  }
  return rewards;
}

// ── 접속 관리 ──

export function handleDisconnect(userId: number): void {
  const matchId = userMatchMap.get(userId);
  if (!matchId) return;
  const match = activeMatches.get(matchId);
  if (!match) return;
  const p = match.participants.find((pp) => pp.userId === userId);
  if (!p || !p.alive) return;

  p.connected = false;
  eventHandler?.onPlayerDisconnected(matchId, userId);

  reconnectTimers.set(userId, setTimeout(() => {
    const m = activeMatches.get(matchId);
    if (!m) return;
    const pp = m.participants.find((x) => x.userId === userId);
    if (pp && !pp.connected && pp.alive) {
      pp.alive = false;
      pp.hp = 0;
    }
    reconnectTimers.delete(userId);
  }, RECONNECT_TIMEOUT_SECONDS * 1000));
}

export function handleReconnect(userId: number): void {
  const timer = reconnectTimers.get(userId);
  if (timer) { clearTimeout(timer); reconnectTimers.delete(userId); }

  const matchId = userMatchMap.get(userId);
  if (!matchId) return;
  const match = activeMatches.get(matchId);
  if (!match) return;
  const p = match.participants.find((pp) => pp.userId === userId);
  if (p) { p.connected = true; eventHandler?.onPlayerReconnected(matchId, userId); }
}

// ── 유틸 ──

export function getUserMatch(userId: number): ArenaMatch | null {
  const matchId = userMatchMap.get(userId);
  return matchId ? activeMatches.get(matchId) ?? null : null;
}

export function getQueueCount(mode: ArenaMode): number {
  return queues.get(mode)?.length ?? 0;
}

function clearMatchTimer(matchId: string): void {
  const timer = matchTimers.get(matchId);
  if (timer) { clearInterval(timer); matchTimers.delete(matchId); }
}

function cleanupMatchStats(matchId: string): void {
  killCounts.delete(matchId);
  damageDealt.delete(matchId);
  damageTaken.delete(matchId);
  deathOrder.delete(matchId);
}
