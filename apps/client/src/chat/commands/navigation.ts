import { MIN_FLOOR, MAX_FLOOR, DEFAULT_FLOOR } from '@metaverse/shared';
import { useGameStore } from '../../stores/gameStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import * as api from '../../services/api.js';
import type { CommandDefinition } from './types.js';
import { requireSocket } from './utils.js';

function gotoFloor(floor: number): void {
  const socket = requireSocket();
  socket.emit('floor:join', floor);
  useGameStore.getState().setFloor(floor);
  // 층 이동 시 공개 채팅 히스토리 갱신
  useChatStore.getState().clearPublicMessages();
  api.getPublicChatHistory(floor).then((msgs) => {
    useChatStore.getState().loadRoomMessages(null, msgs);
  }).catch(console.error);
}

/** /goto <floor> — jump to a specific floor number. */
const gotoCommand: CommandDefinition = {
  name: 'goto',
  aliases: ['floor'],
  usage: '/goto <층번호>',
  description: '지정한 층으로 이동합니다',
  scope: 'any',
  execute(args, _raw, ctx) {
    if (args.length === 0) {
      ctx.pushSystemMessage(`사용법: /goto <${MIN_FLOOR}-${MAX_FLOOR}>`, ctx.roomId);
      return { handled: true };
    }
    const floor = Number(args[0]);
    if (!Number.isInteger(floor) || floor < MIN_FLOOR || floor > MAX_FLOOR) {
      ctx.pushSystemMessage(`유효한 층 번호는 ${MIN_FLOOR}~${MAX_FLOOR} 입니다`, ctx.roomId);
      return { handled: true };
    }
    gotoFloor(floor);
    ctx.pushSystemMessage(`${floor}F 으로 이동`, ctx.roomId);
    return { handled: true };
  },
};

/** /home — return to the default floor. */
const homeCommand: CommandDefinition = {
  name: 'home',
  usage: '/home',
  description: `기본 층(${DEFAULT_FLOOR}F)으로 이동합니다`,
  scope: 'any',
  execute(_args, _raw, ctx) {
    gotoFloor(DEFAULT_FLOOR);
    ctx.pushSystemMessage(`${DEFAULT_FLOOR}F 으로 이동`, ctx.roomId);
    return { handled: true };
  },
};

/** /find <nickname> — show where a user currently is. */
const findCommand: CommandDefinition = {
  name: 'find',
  aliases: ['where'],
  usage: '/find <닉네임>',
  description: '사용자의 현재 접속 상태와 위치(층)를 확인합니다',
  scope: 'any',
  async execute(args, _raw, ctx) {
    if (args.length === 0) {
      ctx.pushSystemMessage('사용법: /find <닉네임>', ctx.roomId);
      return { handled: true };
    }
    const nickname = args.join(' ').trim();
    try {
      const loc = await api.locateUser(nickname);
      const status = loc.isOnline
        ? loc.floor !== null
          ? `${loc.floor}F 접속 중`
          : '접속 중 (층 정보 없음)'
        : '오프라인';
      const presenceLabel = loc.presence
        ? ` · ${presenceText(loc.presence.mode)}${loc.presence.message ? `: ${loc.presence.message}` : ''}`
        : '';
      ctx.pushSystemMessage(`${loc.nickname}: ${status}${presenceLabel}`, ctx.roomId);
    } catch (err: any) {
      const msg = err?.response?.status === 404 ? '사용자를 찾을 수 없습니다' : '검색 실패';
      ctx.pushSystemMessage(msg, ctx.roomId);
    }
    return { handled: true };
  },
};

/** /join <nickname> — follow another user to their current floor. */
const joinCommand: CommandDefinition = {
  name: 'join',
  aliases: ['follow'],
  usage: '/join <닉네임>',
  description: '해당 사용자가 있는 층으로 이동합니다',
  scope: 'any',
  async execute(args, _raw, ctx) {
    if (args.length === 0) {
      ctx.pushSystemMessage('사용법: /join <닉네임>', ctx.roomId);
      return { handled: true };
    }
    const nickname = args.join(' ').trim();
    try {
      const loc = await api.locateUser(nickname);
      if (!loc.isOnline || loc.floor === null) {
        ctx.pushSystemMessage(`${loc.nickname} 이(가) 접속 중이 아닙니다`, ctx.roomId);
        return { handled: true };
      }
      gotoFloor(loc.floor);
      ctx.pushSystemMessage(`${loc.nickname}의 위치(${loc.floor}F)로 이동`, ctx.roomId);
    } catch (err: any) {
      const msg = err?.response?.status === 404 ? '사용자를 찾을 수 없습니다' : '이동 실패';
      ctx.pushSystemMessage(msg, ctx.roomId);
    }
    return { handled: true };
  },
};

function presenceText(mode: 'available' | 'busy' | 'afk'): string {
  switch (mode) {
    case 'available':
      return '대화 가능';
    case 'busy':
      return '방해 금지';
    case 'afk':
      return '자리 비움';
  }
}

export const navigationCommands: CommandDefinition[] = [
  gotoCommand,
  homeCommand,
  findCommand,
  joinCommand,
];
