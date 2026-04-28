import { useMemo } from 'react';
import type { MemberSummary, PresenceMode } from '@metaverse/shared';
import { useAuthStore } from '../../stores/authStore.js';
import { useMemberStore } from '../../stores/memberStore.js';

interface PresenceStyle {
  dot: string;
  label: string;
}

function presenceStyleFor(member: MemberSummary): PresenceStyle {
  if (!member.isOnline) return { dot: 'bg-gray-400', label: '오프라인' };
  const mode: PresenceMode = member.presence?.mode ?? 'available';
  switch (mode) {
    case 'busy':
      return { dot: 'bg-red-500', label: '방해 금지' };
    case 'afk':
      return { dot: 'bg-yellow-400', label: '자리 비움' };
    case 'available':
    default:
      return { dot: 'bg-green-500', label: '온라인' };
  }
}

/** Stable numeric rank for sorting by availability (lower = higher priority). */
function availabilityRank(member: MemberSummary): number {
  if (!member.isOnline) return 3;
  const mode = member.presence?.mode ?? 'available';
  if (mode === 'available') return 0;
  if (mode === 'afk') return 1;
  return 2; // busy
}

export default function MemberList() {
  const myId = useAuthStore((s) => s.user?.id);
  const members = useMemberStore((s) => s.members);

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.id === myId) return -1;
      if (b.id === myId) return 1;
      const rankDelta = availabilityRank(a) - availabilityRank(b);
      if (rankDelta !== 0) return rankDelta;
      return a.nickname.localeCompare(b.nickname);
    });
  }, [members, myId]);

  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <div className="panel-cy p-3 flex flex-col max-h-[calc(100vh-20rem)]">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h3 className="font-bold text-cy-brown text-sm">회원 목록</h3>
        <span className="text-xs text-cy-warm-gray">
          <span className="text-green-500">●</span> {onlineCount}/{members.length}
        </span>
      </div>

      <ul className="flex-1 overflow-y-auto space-y-1 pr-1">
        {sorted.length === 0 ? (
          <li className="text-xs text-cy-warm-gray text-center py-4">회원이 없습니다</li>
        ) : (
          sorted.map((m) => {
            const style = presenceStyleFor(m);
            const statusMsg = m.presence?.message;
            return (
              <li
                key={m.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-cy ${
                  m.isOnline ? 'bg-white/60' : 'bg-white/20 opacity-60'
                }`}
                title={statusMsg ? `${style.label} — ${statusMsg}` : style.label}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                  aria-label={style.label}
                />
                <span className="flex-1 min-w-0 truncate text-sm text-cy-brown">
                  {m.nickname}
                  {m.id === myId && (
                    <span className="ml-1 text-[10px] text-cy-orange font-medium">(나)</span>
                  )}
                  {statusMsg && (
                    <span className="ml-1 text-[10px] text-cy-warm-gray italic">· {statusMsg}</span>
                  )}
                </span>
                <span className="text-[10px] text-cy-warm-gray shrink-0">Lv.{m.level}</span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
