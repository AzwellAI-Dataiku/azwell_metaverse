import type { ChatMessage } from '@metaverse/shared';

export type CommandScope = 'any' | 'public' | 'dm' | 'group';

export interface CommandContext {
  /** Active tab at the moment the command is typed. */
  tabType: 'public' | 'dm' | 'group';
  /** Current DM/group roomId, null for public tab. */
  roomId: number | null;
  /**
   * Append a synthetic system message to the local chat store.
   * Used by commands to show feedback without going through the server.
   */
  pushSystemMessage: (content: string, roomId?: number | null) => void;
}

export interface CommandResult {
  /**
   * If true, the dispatcher consumed the input and the caller should NOT
   * forward the text to the server as a chat message.
   */
  handled: boolean;
}

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  /** Short usage string shown by /help. Example: "/dm <닉네임> <메시지>". */
  usage: string;
  description: string;
  scope?: CommandScope;
  execute: (
    args: string[],
    rawArgs: string,
    ctx: CommandContext
  ) => Promise<CommandResult> | CommandResult;
}

/** Builder for client-synthesized system messages (senderId === 0). */
export function buildSystemMessage(content: string, roomId: number | null): ChatMessage {
  return {
    id: -Date.now() - Math.floor(Math.random() * 1000),
    senderId: 0,
    senderNickname: 'SYSTEM',
    roomId,
    content,
    floor: null,
    createdAt: new Date().toISOString(),
  };
}
