import type { CommandDefinition } from './types.js';
import { requireSocket } from './utils.js';

/**
 * /e <emoji>
 * Broadcast a character-floating emote to the current floor.
 */
const emoteCommand: CommandDefinition = {
  name: 'e',
  aliases: ['emote'],
  usage: '/e <이모지>',
  description: '캐릭터 위에 이모지를 표시합니다',
  scope: 'any',
  execute(args, _raw, ctx) {
    if (args.length === 0) {
      ctx.pushSystemMessage('사용법: /e <이모지>  예) /e 👋', ctx.roomId);
      return { handled: true };
    }
    const emoji = args[0];
    requireSocket().emit('player:emote', { emoji });
    return { handled: true };
  },
};

/**
 * /me <action>
 * Client-synthesized action line. Shown only to the sender as a system message.
 * (Proper /me broadcast would need a server event — kept local for now.)
 */
const meCommand: CommandDefinition = {
  name: 'me',
  usage: '/me <행동>',
  description: '행동 묘사를 시스템 메시지로 표시합니다 (자신만 보임)',
  scope: 'any',
  execute(_args, rawArgs, ctx) {
    const action = rawArgs.trim();
    if (!action) {
      ctx.pushSystemMessage('사용법: /me <행동 묘사>', ctx.roomId);
      return { handled: true };
    }
    ctx.pushSystemMessage(`* ${action}`, ctx.roomId);
    return { handled: true };
  },
};

export const expressionCommands: CommandDefinition[] = [emoteCommand, meCommand];
