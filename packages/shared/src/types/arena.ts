import type { CombatAction, ArenaMode, ArenaRankTier } from '../constants/combat.js';
import type { Gender, CharacterAppearance } from './character.js';

// ── 8방향 타입 ──

export type Direction8 = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

// ── 매치 상태 머신 ──

export type MatchState =
  | 'queuing'        // 대기열에서 매칭 중
  | 'countdown'      // 매칭 완료, 카운트다운
  | 'ready_check'    // 팀전 레디 체크
  | 'fighting'       // 실시간 전투 진행 중
  | 'match_end'      // 매치 종료
  | 'rewards';       // 보상 지급

// ── 참가자 (서버 상태) ──

export interface ArenaParticipant {
  userId: number;
  nickname: string;
  level: number;
  tier: ArenaRankTier;
  gender: Gender;
  appearance: CharacterAppearance;
  team: number;              // 0 = FFA, 1 or 2 = 팀
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  alive: boolean;
  connected: boolean;
  x: number;                 // 아레나 맵 좌표
  y: number;
  direction: Direction8;
  potionUsesLeft: number;
  // 쿨타임 (마지막 사용 시각, ms)
  lastShootAt: number;
  lastRushAt: number;
  lastDefendAt: number;
  defendingUntil: number;    // 방어 종료 시각
}

// ── 투사체 ──

export interface Projectile {
  id: string;
  ownerId: number;
  type: 'bullet' | 'slash';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  createdAt: number;
}

// ── 매치 정보 ──

export interface ArenaMatch {
  matchId: string;
  mode: ArenaMode;
  state: MatchState;
  participants: ArenaParticipant[];
  projectiles: Projectile[];
  prizePool: number;
  matchDuration: number;     // 제한시간 (초)
  startedAt: number;
  createdAt: number;
}

// ── 매치 결과 ──

export interface MatchReward {
  userId: number;
  rank: number;
  goldEarned: number;
  xpEarned: number;
  isMvp: boolean;
  totalDamageDealt: number;
  totalDamageTaken: number;
  kills: number;
}

export interface MatchEndResult {
  matchId: string;
  mode: ArenaMode;
  rewards: MatchReward[];
  winnerTeam?: number;
  isDraw: boolean;
}

// ── 대기열 ──

export interface QueueEntry {
  userId: number;
  nickname: string;
  level: number;
  tier: ArenaRankTier;
  gender: Gender;
  appearance: CharacterAppearance;
  mode: ArenaMode;
  joinedAt: number;
}

// ── 클라이언트 → 서버 이벤트 데이터 ──

export interface ArenaJoinData {
  mode: ArenaMode;
}

export interface ArenaReadyData {
  matchId: string;
  ready: boolean;
}

/** 리얼타임 이동 입력 */
export interface ArenaMoveData {
  matchId: string;
  x: number;
  y: number;
  direction: Direction8;
}

/** 리얼타임 스킬 사용 */
export interface ArenaSkillData {
  matchId: string;
  action: CombatAction;
  targetX?: number;  // 총 발사 방향 목표 좌표
  targetY?: number;
}

// ── 서버 → 클라이언트 이벤트 데이터 ──

export interface ArenaQueueUpdate {
  mode: ArenaMode;
  playersInQueue: number;
}

export interface ArenaMatchFound {
  matchId: string;
  mode: ArenaMode;
  participants: Array<{
    userId: number;
    nickname: string;
    level: number;
    team: number;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
    gender: Gender;
    appearance: CharacterAppearance;
  }>;
  countdownEndsAt: number;
}

/** 서버 틱: 전체 상태 동기화 (200ms 간격) */
export interface ArenaTickData {
  matchId: string;
  timeLeft: number;          // 남은 시간 (초)
  players: Array<{
    userId: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    alive: boolean;
    direction: Direction8;
    defending: boolean;
  }>;
  projectiles: Array<{
    id: string;
    ownerId: number;
    type: 'bullet' | 'slash';
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
}

export interface ArenaDamageEvent {
  matchId: string;
  attackerId: number;
  targetId: number;
  damage: number;
  action: CombatAction;
  targetHpAfter: number;
  killed: boolean;
}

export interface ArenaHealEvent {
  matchId: string;
  userId: number;
  amount: number;
  hpAfter: number;
}

export interface ArenaMatchEnd {
  matchId: string;
  result: MatchEndResult;
}

export interface ArenaTargetData {
  matchId: string;
  targetUserId: number;
}
