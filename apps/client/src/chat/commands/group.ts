import { useChatStore } from '../../stores/chatStore.js';
import * as api from '../../services/api.js';
import type { CommandDefinition } from './types.js';
import { findMemberByNickname, requireSocket } from './utils.js';

/**
 * /g <groupName> <message...>
 * Send a message to an existing group room. Matches group name exactly (case-insensitive).
 */
const groupSendCommand: CommandDefinition = {
  name: 'g',
  aliases: ['group'],
  usage: '/g <그룹명> <메시지>',
  description: '기존 그룹 채팅에 메시지를 전송합니다',
  scope: 'any',
  execute(args, _raw, ctx) {
    if (args.length < 2) {
      ctx.pushSystemMessage('사용법: /g <그룹명> <메시지>', ctx.roomId);
      return { handled: true };
    }
    const groupName = args[0].toLowerCase();
    const content = args.slice(1).join(' ').trim();

    const room = useChatStore
      .getState()
      .rooms.find((r) => r.type === 'group' && (r.name ?? '').toLowerCase() === groupName);

    if (!room) {
      ctx.pushSystemMessage(`그룹 "${args[0]}" 을(를) 찾을 수 없습니다`, ctx.roomId);
      return { handled: true };
    }

    requireSocket().emit('chat:private', { roomId: room.id, content });
    ctx.pushSystemMessage(`${room.name} 그룹에 메시지 전송`, ctx.roomId);
    return { handled: true };
  },
};

/**
 * /meet <groupName> <닉네임1,닉네임2,...>
 * Create a new group room with the listed nicknames as members.
 */
const meetCommand: CommandDefinition = {
  name: 'meet',
  usage: '/meet <그룹명> <닉네임1,닉네임2,...>',
  description: '여러 명과 새 그룹 채팅을 시작합니다',
  scope: 'any',
  async execute(args, _raw, ctx) {
    if (args.length < 2) {
      ctx.pushSystemMessage('사용법: /meet <그룹명> <닉네임1,닉네임2,...>', ctx.roomId);
      return { handled: true };
    }
    const [name, nickList] = [args[0], args.slice(1).join(' ')];

    const nicknames = nickList
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (nicknames.length === 0) {
      ctx.pushSystemMessage('최소 한 명의 멤버 닉네임이 필요합니다', ctx.roomId);
      return { handled: true };
    }

    const memberIds: number[] = [];
    const missing: string[] = [];
    for (const nick of nicknames) {
      const m = findMemberByNickname(nick);
      if (m) memberIds.push(m.id);
      else missing.push(nick);
    }
    if (missing.length > 0) {
      ctx.pushSystemMessage(`찾을 수 없는 사용자: ${missing.join(', ')}`, ctx.roomId);
      return { handled: true };
    }

    await api.createGroupChat(name, memberIds);
    const rooms = await api.getChatRooms();
    useChatStore.getState().setRooms(rooms);
    ctx.pushSystemMessage(`그룹 "${name}" 생성 완료 (${memberIds.length}명)`, ctx.roomId);
    return { handled: true };
  },
};

export const groupCommands: CommandDefinition[] = [groupSendCommand, meetCommand];
