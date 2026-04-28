import { create } from 'zustand';
import { getSocket } from '../services/socket.js';
import type {
  ArenaMatchFound, ArenaMatchEnd, ArenaTickData,
  ArenaDamageEvent, ArenaHealEvent,
  MatchReward, MatchState,
} from '@metaverse/shared';
import type { ArenaMode, CombatAction, Gender, CharacterAppearance, Direction8 } from '@metaverse/shared';

/** 틱에서 수신한 플레이어 상태 */
export interface TickPlayer {
  userId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  direction: Direction8;
  defending: boolean;
}

/** 틱에서 수신한 투사체 */
export interface TickProjectile {
  id: string;
  ownerId: number;
  type: 'bullet' | 'slash';
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** 매치 참가자 기본 정보 (매치 시작 시 수신) */
export interface MatchParticipant {
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
}

/** 킬 피드 항목 */
export interface KillFeedEntry {
  killerId: number;
  victimId: number;
  action: string;
  timestamp: number;
}

interface ArenaState {
  // UI 상태
  isLobbyOpen: boolean;
  isCombatOpen: boolean;

  // 대기열
  queueCounts: Record<ArenaMode, number>;
  inQueue: boolean;
  queueMode: ArenaMode | null;

  // 매치 기본 정보
  matchId: string | null;
  matchState: MatchState | null;
  mode: ArenaMode | null;
  participants: MatchParticipant[];
  countdownEndsAt: number | null;

  // 리얼타임 틱 데이터
  timeLeft: number;
  players: TickPlayer[];
  projectiles: TickProjectile[];

  // 킬 피드
  killFeed: KillFeedEntry[];

  // 매치 결과
  matchResult: { rewards: MatchReward[]; isDraw: boolean; winnerTeam?: number } | null;

  // 에러
  error: string | null;

  // 액션
  openLobby: () => void;
  closeLobby: () => void;
  joinQueue: (mode: ArenaMode) => void;
  leaveQueue: () => void;
  sendMove: (x: number, y: number, direction: Direction8) => void;
  sendSkill: (action: CombatAction, targetX?: number, targetY?: number) => void;
  setReady: (ready: boolean) => void;
  startMatch: () => void;
  rematch: () => void;
  closeCombat: () => void;
  clearError: () => void;

  // 소켓 이벤트 핸들러
  _handleQueueUpdate: (data: { mode: ArenaMode; playersInQueue: number }) => void;
  _handleMatchFound: (data: ArenaMatchFound) => void;
  _handleMatchStart: (data: { matchId: string }) => void;
  _handleTick: (data: ArenaTickData) => void;
  _handleDamage: (data: ArenaDamageEvent) => void;
  _handleHeal: (data: ArenaHealEvent) => void;
  _handleKill: (data: { matchId: string; killerId: number; victimId: number; action: string }) => void;
  _handleMatchEnd: (data: ArenaMatchEnd) => void;
  _handleError: (data: { message: string }) => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  isLobbyOpen: false,
  isCombatOpen: false,
  queueCounts: { ffa: 0, team_2v2: 0, team_3v3: 0 },
  inQueue: false,
  queueMode: null,
  matchId: null,
  matchState: null,
  mode: null,
  participants: [],
  countdownEndsAt: null,
  timeLeft: 0,
  players: [],
  projectiles: [],
  killFeed: [],
  matchResult: null,
  error: null,

  openLobby: () => set({ isLobbyOpen: true }),
  closeLobby: () => {
    const state = get();
    if (state.inQueue) {
      const socket = getSocket();
      socket?.emit('arena:leave');
    }
    set({ isLobbyOpen: false, inQueue: false, queueMode: null });
  },

  joinQueue: (mode) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('arena:join', { mode });
    set({ inQueue: true, queueMode: mode });
  },

  leaveQueue: () => {
    const socket = getSocket();
    socket?.emit('arena:leave');
    set({ inQueue: false, queueMode: null });
  },

  sendMove: (x, y, direction) => {
    const socket = getSocket();
    const { matchId } = get();
    if (!socket || !matchId) return;
    socket.emit('arena:move', { matchId, x, y, direction });
  },

  sendSkill: (action, targetX, targetY) => {
    const socket = getSocket();
    const { matchId } = get();
    if (!socket || !matchId) return;
    socket.emit('arena:skill', { matchId, action, targetX, targetY });
  },

  startMatch: () => {
    const socket = getSocket();
    const { queueMode } = get();
    if (!socket || !queueMode) return;
    socket.emit('arena:start', { mode: queueMode });
  },

  setReady: (ready) => {
    const socket = getSocket();
    const { matchId } = get();
    if (!socket || !matchId) return;
    socket.emit('arena:ready', { matchId, ready });
  },

  rematch: () => {
    const { mode } = get();
    if (!mode) return;
    set({
      matchId: null, matchState: null, participants: [],
      players: [], projectiles: [], killFeed: [],
      matchResult: null, isCombatOpen: false, timeLeft: 0,
    });
    get().joinQueue(mode);
  },

  closeCombat: () => set({
    isCombatOpen: false, matchId: null, matchState: null,
    participants: [], players: [], projectiles: [],
    killFeed: [], matchResult: null, timeLeft: 0,
  }),

  clearError: () => set({ error: null }),

  // ── 소켓 이벤트 핸들러 ──

  _handleQueueUpdate: (data) => {
    set((s) => ({
      queueCounts: { ...s.queueCounts, [data.mode]: data.playersInQueue },
    }));
  },

  _handleMatchFound: (data) => {
    set({
      matchId: data.matchId,
      mode: data.mode,
      matchState: 'countdown',
      participants: data.participants,
      countdownEndsAt: data.countdownEndsAt,
      isLobbyOpen: false,
      isCombatOpen: true,
      inQueue: false,
      queueMode: null,
      killFeed: [],
    });
  },

  _handleMatchStart: (_data) => {
    set({ matchState: 'fighting' });
  },

  _handleTick: (data) => {
    set({
      timeLeft: data.timeLeft,
      players: data.players,
      projectiles: data.projectiles,
    });
  },

  _handleDamage: (_data) => {
    // 데미지 이펙트는 Phaser ArenaScene에서 처리
  },

  _handleHeal: (_data) => {
    // 힐 이펙트는 Phaser ArenaScene에서 처리
  },

  _handleKill: (data) => {
    set((s) => ({
      killFeed: [
        ...s.killFeed.slice(-9), // 최근 10개만 유지
        {
          killerId: data.killerId,
          victimId: data.victimId,
          action: data.action,
          timestamp: Date.now(),
        },
      ],
    }));
  },

  _handleMatchEnd: (data) => {
    set({
      matchState: 'match_end',
      matchResult: {
        rewards: data.result.rewards,
        isDraw: data.result.isDraw,
        winnerTeam: data.result.winnerTeam,
      },
    });
  },

  _handleError: (data) => {
    set({ error: data.message, inQueue: false, queueMode: null });
  },
}));
