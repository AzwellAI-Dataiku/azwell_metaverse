import type { Character, CharacterAppearance, Gender } from './character.js';
import type { ChatMessage } from './chat.js';
import type { QuestProgress } from './quest.js';
import type { PresenceInfo, PresenceMode } from './user.js';
import type {
  ArenaQueueUpdate, ArenaMatchFound, ArenaMatchEnd,
  ArenaJoinData, ArenaReadyData, ArenaMoveData, ArenaSkillData,
  ArenaTickData, ArenaDamageEvent, ArenaHealEvent,
} from './arena.js';
import type { ArenaMode } from '../constants/combat.js';

export interface PlayerState {
  userId: number;
  nickname: string;
  level: number;
  gender: Gender;
  appearance: CharacterAppearance;
  floor: number;
  x: number;
  y: number;
  isSitting: boolean;
  direction: Direction;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface ServerToClientEvents {
  'player:joined': (player: PlayerState) => void;
  'player:left': (userId: number) => void;
  'player:moved': (data: { userId: number; x: number; y: number; direction: Direction }) => void;
  'player:sat': (data: { userId: number; x: number; y: number }) => void;
  'player:stood': (data: { userId: number; x: number; y: number }) => void;
  'player:floor-changed': (data: { userId: number; floor: number }) => void;
  'player:nickname-changed': (data: { userId: number; nickname: string }) => void;

  'user:online': (data: { userId: number }) => void;
  'user:offline': (data: { userId: number }) => void;
  'user:registered': (data: { id: number; nickname: string; level: number }) => void;
  'user:presence-changed': (data: { userId: number; presence: PresenceInfo | null }) => void;

  'chat:system': (data: { content: string; roomId: number | null }) => void;

  'floor:players': (players: PlayerState[]) => void;

  'chat:public': (message: ChatMessage) => void;
  'chat:private': (message: ChatMessage) => void;
  'chat:typing': (data: { userId: number; isTyping: boolean }) => void;

  'player:emote': (data: { userId: number; emoji: string }) => void;

  'quest:progress': (progress: QuestProgress) => void;
  'quest:completed': (data: { questId: number; xpReward: number; goldReward: number }) => void;
  'level:up': (data: { userId: number; newLevel: number }) => void;

  'currency:changed': (data: { userId: number; gold: number; delta: number }) => void;

  'inventory:updated': (data: { userId: number }) => void;

  'itembox:spawned': (data: { boxId: string; floor: number; x: number; y: number }) => void;
  'itembox:picked': (data: { boxId: string; userId: number; itemName: string; rarity: string }) => void;
  'itembox:expired': (data: { boxId: string }) => void;
  'itembox:announce': (data: { floor: number; secondsUntil: number }) => void;

  // Arena events
  'arena:queue-update': (data: ArenaQueueUpdate) => void;
  'arena:match-found': (data: ArenaMatchFound) => void;
  'arena:countdown': (data: { matchId: string; secondsLeft: number }) => void;
  'arena:ready-check': (data: { matchId: string; deadline: number }) => void;
  'arena:ready-status': (data: { matchId: string; userId: number; ready: boolean }) => void;
  'arena:match-start': (data: { matchId: string }) => void;
  'arena:tick': (data: ArenaTickData) => void;
  'arena:damage': (data: ArenaDamageEvent) => void;
  'arena:heal': (data: ArenaHealEvent) => void;
  'arena:kill': (data: { matchId: string; killerId: number; victimId: number; action: string }) => void;
  'arena:match-end': (data: ArenaMatchEnd) => void;
  'arena:player-disconnected': (data: { matchId: string; userId: number }) => void;
  'arena:player-reconnected': (data: { matchId: string; userId: number }) => void;
  'arena:error': (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  'player:move': (data: { x: number; y: number; direction: Direction }) => void;
  'player:sit': (data: { x: number; y: number }) => void;
  'player:stand': () => void;

  'floor:join': (floor: number) => void;
  'floor:leave': () => void;

  'chat:public': (data: { content: string }) => void;
  'chat:private': (data: { roomId: number; content: string }) => void;
  'chat:typing': (data: { isPublic: boolean; roomId?: number }) => void;
  'chat:stop-typing': () => void;

  'chat:create-dm': (data: { targetUserId: number }) => void;
  'chat:create-group': (data: { name: string; memberIds: number[] }) => void;

  'player:emote': (data: { emoji: string }) => void;

  'presence:update': (data: { mode: PresenceMode; message?: string | null; brbUntil?: number | null }) => void;
  'presence:clear': () => void;

  'itembox:pickup': (data: { boxId: string }) => void;

  // Arena events
  'arena:join': (data: ArenaJoinData) => void;
  'arena:leave': () => void;
  'arena:ready': (data: ArenaReadyData) => void;
  'arena:move': (data: ArenaMoveData) => void;
  'arena:skill': (data: ArenaSkillData) => void;
  'arena:start': (data: { mode: ArenaMode }) => void;
  'arena:rematch': (data: { mode: ArenaMode }) => void;
}
