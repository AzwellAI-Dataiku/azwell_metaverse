import { useArenaStore } from '../../stores/arenaStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { ARENA_MODE_NAMES } from '@metaverse/shared';

export default function CombatView() {
  const {
    isCombatOpen, matchState, mode, timeLeft,
    participants, players, killFeed,
    matchResult, closeCombat, rematch,
  } = useArenaStore();
  const user = useAuthStore((s) => s.user);
  const myUserId = user?.id;

  if (!isCombatOpen) return null;

  // 매치 결과 화면
  if (matchState === 'match_end' && matchResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-[500px] text-white">
          <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-3 flex items-center justify-between rounded-t-2xl">
            <h2 className="font-bold">
              {matchResult.isDraw ? '🤝 무승부' : '🏆 매치 종료'}
            </h2>
            <button onClick={closeCombat} className="text-white/60 hover:text-white text-lg">✕</button>
          </div>

          <div className="p-4 space-y-2">
            {matchResult.rewards
              .sort((a, b) => a.rank - b.rank)
              .map((r) => {
                const p = participants.find((pp) => pp.userId === r.userId);
                const isMe = r.userId === myUserId;
                return (
                  <div
                    key={r.userId}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isMe ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-gray-800'
                    }`}
                  >
                    <span className="text-lg w-8 text-center">
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `${r.rank}위`}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {p?.nickname ?? `User${r.userId}`}
                        {r.isMvp && <span className="ml-1 text-yellow-400 text-xs">MVP</span>}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        데미지: {r.totalDamageDealt} | 킬: {r.kills}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-yellow-400">+{r.goldEarned}G</div>
                      <div className="text-blue-400">+{r.xpEarned}XP</div>
                    </div>
                  </div>
                );
              })}

            <div className="flex gap-3 mt-4">
              <button
                onClick={rematch}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
              >
                리매치
              </button>
              <button
                onClick={closeCombat}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-600"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 카운트다운 대기 화면 (로비에서 시작 → 매치 생성 → 곧바로 fighting 전환)
  if (matchState === 'countdown') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-gray-900 rounded-2xl shadow-2xl w-[400px] text-white p-6 text-center">
          <h2 className="text-xl font-bold mb-2">⚔️ {mode ? ARENA_MODE_NAMES[mode] : '아레나'}</h2>
          <p className="text-gray-400 text-sm mb-4 animate-pulse">전투 준비 중...</p>
          <div className="space-y-2">
            {participants.map((p) => (
              <div key={p.userId} className={`text-sm ${p.userId === myUserId ? 'text-yellow-400' : 'text-gray-300'}`}>
                {p.userId === myUserId ? '⭐ ' : ''}{p.nickname} (Lv.{p.level})
                {p.team > 0 && <span className={`ml-1 text-xs ${p.team === 1 ? 'text-blue-400' : 'text-red-400'}`}>팀{p.team}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 전투 진행 중 — HUD 오버레이 (Phaser ArenaScene 위에 표시)
  if (matchState === 'fighting') {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        {/* 상단 중앙: 타이머 + 모드 */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg px-5 py-1.5 text-white text-center">
          <div className="text-[10px] text-gray-400">{mode ? ARENA_MODE_NAMES[mode] : ''}</div>
          <div className="text-lg font-bold tabular-nums leading-tight">
            {Math.floor(timeLeft / 60)}:{String(Math.floor(timeLeft % 60)).padStart(2, '0')}
          </div>
        </div>

        {/* 좌측 상단: HP 바 목록 (타이머 아래) */}
        <div className="absolute top-14 left-3 space-y-1.5 w-44">
          {players.map((p) => {
            const info = participants.find((pp) => pp.userId === p.userId);
            const hpPercent = p.maxHp > 0 ? Math.max(0, (p.hp / p.maxHp) * 100) : 0;
            const isMe = p.userId === myUserId;
            return (
              <div key={p.userId} className={`bg-black/40 rounded px-1.5 py-0.5 ${!p.alive ? 'opacity-40' : ''}`}>
                <div className={`text-[10px] font-medium truncate ${isMe ? 'text-yellow-400' : 'text-gray-300'}`}>
                  {isMe ? '⭐ ' : ''}{info?.nickname ?? `P${p.userId}`}
                  {info && info.team > 0 && (
                    <span className={`ml-1 ${info.team === 1 ? 'text-blue-400' : 'text-red-400'}`}>T{info.team}</span>
                  )}
                </div>
                <div className="bg-gray-700 rounded-full h-2.5 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${
                      hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${hpPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow">
                    {p.hp}/{p.maxHp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측 상단: 킬 피드 (타이머 아래) */}
        {killFeed.length > 0 && (
          <div className="absolute top-14 right-3 space-y-1 w-48">
            {killFeed.slice(-5).map((k, i) => {
              const killer = participants.find((p) => p.userId === k.killerId);
              const victim = participants.find((p) => p.userId === k.victimId);
              return (
                <div key={i} className="bg-black/50 rounded px-2 py-1 text-[10px] text-gray-300">
                  <span className="text-red-400 font-medium">{killer?.nickname ?? '?'}</span>
                  {' → '}
                  <span className="text-gray-400">{victim?.nickname ?? '?'}</span>
                  <span className="ml-1 text-gray-500">({k.action})</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 하단 중앙: 스킬 키 안내 */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {[
            { key: 'Q', name: '총', icon: '🔫' },
            { key: 'W', name: '칼', icon: '🗡️' },
            { key: 'E', name: '방어', icon: '🛡️' },
            { key: 'R', name: '물약', icon: '🧪' },
          ].map((s) => (
            <div key={s.key} className="bg-black/60 rounded-lg px-2.5 py-1.5 text-center min-w-[46px]">
              <div className="text-white text-[10px] font-bold">{s.key}</div>
              <div className="text-base">{s.icon}</div>
              <div className="text-[8px] text-gray-400">{s.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
