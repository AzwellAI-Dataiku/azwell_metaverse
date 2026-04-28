import { useChatStore } from '../../stores/chatStore.js';
import { findCommand } from './registry.js';
import { buildSystemMessage, type CommandContext, type CommandResult } from './types.js';

const COMMAND_PREFIX = '/';

function pushSystemMessage(content: string, roomId: number | null = null): void {
  useChatStore.getState().addMessage(buildSystemMessage(content, roomId));
}

export function isCommand(input: string): boolean {
  const trimmed = input.trim();
  // Guard against "//" — users sometimes escape a literal slash.
  return trimmed.startsWith(COMMAND_PREFIX) && !trimmed.startsWith('//');
}

export async function dispatchCommand(
  input: string,
  ctx: Omit<CommandContext, 'pushSystemMessage'>
): Promise<CommandResult> {
  const trimmed = input.trim();
  if (!isCommand(trimmed)) return { handled: false };

  // Split: leading "/name" then the rest (preserve original spacing for messages).
  const body = trimmed.slice(COMMAND_PREFIX.length);
  const firstSpace = body.search(/\s/);
  const name = firstSpace === -1 ? body : body.slice(0, firstSpace);
  const rawArgs = firstSpace === -1 ? '' : body.slice(firstSpace + 1).trim();
  const args = rawArgs ? rawArgs.split(/\s+/) : [];

  const def = findCommand(name);
  if (!def) {
    pushSystemMessage(`알 수 없는 명령어입니다: /${name} — /help 로 목록을 확인하세요.`, ctx.roomId);
    return { handled: true };
  }

  if (def.scope && def.scope !== 'any' && def.scope !== ctx.tabType) {
    pushSystemMessage(
      `/${def.name} 은(는) ${scopeLabel(def.scope)} 에서만 사용할 수 있습니다.`,
      ctx.roomId
    );
    return { handled: true };
  }

  const fullCtx: CommandContext = { ...ctx, pushSystemMessage };

  try {
    return await def.execute(args, rawArgs, fullCtx);
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    pushSystemMessage(`/${def.name} 실행 중 오류: ${message}`, ctx.roomId);
    return { handled: true };
  }
}

function scopeLabel(scope: 'public' | 'dm' | 'group'): string {
  switch (scope) {
    case 'public':
      return '공개 채팅';
    case 'dm':
      return 'DM 채팅';
    case 'group':
      return '그룹 채팅';
  }
}
