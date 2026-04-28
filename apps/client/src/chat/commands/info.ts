import { useAuthStore } from '../../stores/authStore.js';
import { useMemberStore } from '../../stores/memberStore.js';
import { useQuestStore } from '../../stores/questStore.js';
import { useChatStore } from '../../stores/chatStore.js';
import { listCommands, findCommand } from './registry.js';
import type { CommandDefinition } from './types.js';

/** /online — list online members. */
const onlineCommand: CommandDefinition = {
  name: 'online',
  aliases: ['who'],
  usage: '/online',
  description: '현재 접속 중인 회원 목록을 표시합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    const online = useMemberStore
      .getState()
      .members.filter((m) => m.isOnline)
      .map((m) => m.nickname);
    if (online.length === 0) {
      ctx.pushSystemMessage('접속 중인 회원이 없습니다', ctx.roomId);
    } else {
      ctx.pushSystemMessage(`접속 중 (${online.length}): ${online.join(', ')}`, ctx.roomId);
    }
    return { handled: true };
  },
};

/** /whoami — current user info. */
const whoamiCommand: CommandDefinition = {
  name: 'whoami',
  usage: '/whoami',
  description: '현재 로그인된 계정 정보를 표시합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    const user = useAuthStore.getState().user;
    if (!user) {
      ctx.pushSystemMessage('로그인 정보가 없습니다', ctx.roomId);
    } else {
      ctx.pushSystemMessage(`${user.nickname} · Lv.${user.level} · XP ${user.xp}`, ctx.roomId);
    }
    return { handled: true };
  },
};

/** /quest — show daily quest progress summary. */
const questCommand: CommandDefinition = {
  name: 'quest',
  aliases: ['quests'],
  usage: '/quest',
  description: '오늘의 퀘스트 진행 상황을 표시합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    const quests = useQuestStore.getState().dailyQuests;
    if (quests.length === 0) {
      ctx.pushSystemMessage('진행 중인 퀘스트가 없습니다', ctx.roomId);
      return { handled: true };
    }
    const lines = quests.map((q) => {
      const mark = q.completed ? '✓' : '•';
      return `${mark} ${q.quest.title} (${q.progress}/${q.quest.target})`;
    });
    ctx.pushSystemMessage(`오늘의 퀘스트\n${lines.join('\n')}`, ctx.roomId);
    return { handled: true };
  },
};

/** /level — show current level/xp. */
const levelCommand: CommandDefinition = {
  name: 'level',
  aliases: ['lvl'],
  usage: '/level',
  description: '현재 레벨과 XP 정보를 표시합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    const info = useQuestStore.getState().levelInfo;
    const user = useAuthStore.getState().user;
    if (info) {
      const pct = Math.floor(info.xpProgress * 100);
      const totalXp = user?.xp ?? info.currentXp;
      ctx.pushSystemMessage(
        `Lv.${info.level} · ${info.currentXp}/${info.xpForNextLevel} XP (${pct}%, 총 ${totalXp})`,
        ctx.roomId
      );
    } else if (user) {
      ctx.pushSystemMessage(`Lv.${user.level} · ${user.xp} XP`, ctx.roomId);
    } else {
      ctx.pushSystemMessage('레벨 정보가 없습니다', ctx.roomId);
    }
    return { handled: true };
  },
};

/** /time — current local time. */
const timeCommand: CommandDefinition = {
  name: 'time',
  usage: '/time',
  description: '현재 시각을 표시합니다',
  scope: 'any',
  execute(_args, _raw, ctx) {
    const now = new Date();
    ctx.pushSystemMessage(`현재 시각: ${now.toLocaleString('ko-KR')}`, ctx.roomId);
    return { handled: true };
  },
};

/** /clear — wipe locally rendered messages. */
const clearCommand: CommandDefinition = {
  name: 'clear',
  aliases: ['cls'],
  usage: '/clear',
  description: '화면의 채팅 기록을 지웁니다 (서버 기록은 유지)',
  scope: 'any',
  execute(_args, _raw, _ctx) {
    useChatStore.getState().clearMessages();
    return { handled: true };
  },
};

/** /help [command] — list commands or show usage. */
const helpCommand: CommandDefinition = {
  name: 'help',
  aliases: ['h'],
  usage: '/help [명령어]',
  description: '명령어 목록 또는 특정 명령어의 사용법을 표시합니다',
  scope: 'any',
  execute(args, _raw, ctx) {
    if (args.length > 0) {
      const name = args[0].replace(/^\//, '');
      const def = findCommand(name);
      if (!def) {
        ctx.pushSystemMessage(`알 수 없는 명령어: /${name}`, ctx.roomId);
      } else {
        const aliases = def.aliases?.length ? ` (별칭: ${def.aliases.map((a) => `/${a}`).join(', ')})` : '';
        ctx.pushSystemMessage(
          `${def.usage}${aliases}\n${def.description}`,
          ctx.roomId
        );
      }
      return { handled: true };
    }

    const lines = listCommands().map((d) => `${d.usage} — ${d.description}`);
    ctx.pushSystemMessage(`사용 가능한 명령어\n${lines.join('\n')}`, ctx.roomId);
    return { handled: true };
  },
};

export const infoCommands: CommandDefinition[] = [
  onlineCommand,
  whoamiCommand,
  questCommand,
  levelCommand,
  timeCommand,
  clearCommand,
  helpCommand,
];
