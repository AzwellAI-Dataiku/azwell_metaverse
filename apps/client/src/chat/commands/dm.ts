import { useChatStore } from '../../stores/chatStore.js';
import type { CommandDefinition } from './types.js';
import { ensureDmRoomWith, findMemberByNickname, requireSocket } from './utils.js';

/**
 * /dm <nickname> <message...>
 * Resolves or creates a DM room with {nickname}, then sends {message}.
 */
const dmCommand: CommandDefinition = {
  name: 'dm',
  aliases: ['w', 'whisper'],
  usage: '/dm <닉네임> <메시지>',
  description: '닉네임으로 DM을 즉시 전송합니다 (방 자동 생성)',
  scope: 'any',
  async execute(args, _raw, ctx) {
    if (args.length < 2) {
      ctx.pushSystemMessage('사용법: /dm <닉네임> <메시지>', ctx.roomId);
      return { handled: true };
    }
    const nickname = args[0];
    const content = args.slice(1).join(' ').trim();
    if (!content) {
      ctx.pushSystemMessage('메시지를 입력해주세요', ctx.roomId);
      return { handled: true };
    }

    const member = findMemberByNickname(nickname);
    if (!member) {
      ctx.pushSystemMessage(`"${nickname}" 사용자를 찾을 수 없습니다`, ctx.roomId);
      return { handled: true };
    }

    const roomId = await ensureDmRoomWith(member.id);
    requireSocket().emit('chat:private', { roomId, content });
    ctx.pushSystemMessage(`${member.nickname} 에게 DM 전송`, ctx.roomId);
    return { handled: true };
  },
};

/**
 * /r <message...>
 * Reply to the most recent DM sender (chatStore.lastDmSenderId).
 */
const replyCommand: CommandDefinition = {
  name: 'r',
  aliases: ['reply'],
  usage: '/r <메시지>',
  description: '최근 받은 DM 상대에게 바로 답장합니다',
  scope: 'any',
  async execute(_args, rawArgs, ctx) {
    const content = rawArgs.trim();
    if (!content) {
      ctx.pushSystemMessage('사용법: /r <메시지>', ctx.roomId);
      return { handled: true };
    }
    const targetId = useChatStore.getState().lastDmSenderId;
    if (!targetId) {
      ctx.pushSystemMessage('답장할 상대가 없습니다 (아직 받은 DM이 없어요)', ctx.roomId);
      return { handled: true };
    }

    const roomId = await ensureDmRoomWith(targetId);
    requireSocket().emit('chat:private', { roomId, content });
    ctx.pushSystemMessage('답장을 전송했습니다', ctx.roomId);
    return { handled: true };
  },
};

export const dmCommands: CommandDefinition[] = [dmCommand, replyCommand];
