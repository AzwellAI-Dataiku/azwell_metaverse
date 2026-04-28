import type { CommandDefinition } from './types.js';
import { useGoLauncherStore, GO_LINKS } from '../../stores/goLauncherStore.js';

const goCommand: CommandDefinition = {
  name: 'go',
  usage: '/go [옵션명]',
  description: '바로가기 런처를 엽니다 (옵션 지정 시 바로 이동)',
  scope: 'any',
  execute(args, _raw, ctx) {
    const key = args.join(' ').trim();

    // 인수 없이 /go → 팝업 열기
    if (!key) {
      useGoLauncherStore.getState().toggle();
      return { handled: true };
    }

    // 인수 있으면 바로 이동
    const entry = GO_LINKS.find((l) => l.key === key);
    if (!entry) {
      const available = GO_LINKS.map((l) => l.key).join(', ');
      ctx.pushSystemMessage(`알 수 없는 옵션: "${key}"\n사용 가능: ${available}`, ctx.roomId);
      return { handled: true };
    }
    window.open(entry.url, '_blank');
    ctx.pushSystemMessage(`${entry.label} 열기: ${entry.url}`, ctx.roomId);
    return { handled: true };
  },
};

export const goCommands: CommandDefinition[] = [goCommand];
