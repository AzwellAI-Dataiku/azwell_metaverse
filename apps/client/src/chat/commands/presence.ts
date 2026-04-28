import type { CommandDefinition } from './types.js';
import { requireSocket } from './utils.js';

/**
 * /status <message>
 * Set a status message while remaining in 'available' mode. Passing no message
 * clears any existing custom status while keeping the user available.
 */
const statusCommand: CommandDefinition = {
  name: 'status',
  usage: '/status [메시지]',
  description: '상태 메시지를 설정합니다 (available 모드)',
  scope: 'any',
  execute(_args, rawArgs, ctx) {
    const message = rawArgs.trim();
    requireSocket().emit('presence:update', {
      mode: 'available',
      message: message || null,
    });
    ctx.pushSystemMessage(
      message ? `상태 메시지 설정: "${message}"` : '상태 메시지를 지웠습니다',
      ctx.roomId
    );
    return { handled: true };
  },
};

/**
 * /busy [reason]
 * Enter "do not disturb" mode. DMs still arrive but senders get a system notice.
 */
const busyCommand: CommandDefinition = {
  name: 'busy',
  aliases: ['dnd'],
  usage: '/busy [사유]',
  description: '방해 금지 모드로 전환합니다 (발신자에게 알림)',
  scope: 'any',
  execute(_args, rawArgs, ctx) {
    const message = rawArgs.trim();
    requireSocket().emit('presence:update', {
      mode: 'busy',
      message: message || null,
    });
    ctx.pushSystemMessage(
      message ? `방해 금지 모드: "${message}"` : '방해 금지 모드로 전환',
      ctx.roomId
    );
    return { handled: true };
  },
};

/** /afk [reason] — away from keyboard. */
const afkCommand: CommandDefinition = {
  name: 'afk',
  aliases: ['away'],
  usage: '/afk [사유]',
  description: '자리 비움 상태로 전환합니다',
  scope: 'any',
  execute(_args, rawArgs, ctx) {
    const message = rawArgs.trim();
    requireSocket().emit('presence:update', {
      mode: 'afk',
      message: message || null,
    });
    ctx.pushSystemMessage(
      message ? `자리 비움: "${message}"` : '자리 비움 상태로 전환',
      ctx.roomId
    );
    return { handled: true };
  },
};

/** /available — clear presence, back to online. */
const availableCommand: CommandDefinition = {
  name: 'available',
  aliases: ['back', 'avail'],
  usage: '/available',
  description: '상태를 초기화하고 복귀합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    requireSocket().emit('presence:clear');
    ctx.pushSystemMessage('복귀 — 대화 가능 상태', ctx.roomId);
    return { handled: true };
  },
};

/**
 * /brb <minutes>
 * Short afk with auto-expiry. Defaults to 5 minutes if no argument.
 */
const brbCommand: CommandDefinition = {
  name: 'brb',
  usage: '/brb [분]',
  description: '자동 복귀 타이머와 함께 자리 비움 상태로 전환합니다 (기본 5분)',
  scope: 'any',
  execute(args, _raw, ctx) {
    const minutes = args.length > 0 ? Number(args[0]) : 5;
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 240) {
      ctx.pushSystemMessage('사용법: /brb [1-240분]', ctx.roomId);
      return { handled: true };
    }
    const brbUntil = Date.now() + minutes * 60 * 1000;
    requireSocket().emit('presence:update', {
      mode: 'afk',
      message: `잠시 자리 비움 (~${minutes}분)`,
      brbUntil,
    });
    ctx.pushSystemMessage(`${minutes}분 뒤 자동 복귀 예정 (자리 비움)`, ctx.roomId);
    return { handled: true };
  },
};

export const presenceCommands: CommandDefinition[] = [
  statusCommand,
  busyCommand,
  afkCommand,
  availableCommand,
  brbCommand,
];
