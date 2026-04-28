import { useArenaStore } from '../../stores/arenaStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import { ARENA_MODES, ARENA_MODE_NAMES } from '@metaverse/shared';
import type { ArenaMode } from '@metaverse/shared';

const MODES: ArenaMode[] = ['ffa', 'team_2v2', 'team_3v3'];

export default function ArenaLobby() {
  const { isLobbyOpen, closeLobby, queueCounts, inQueue, queueMode, joinQueue, leaveQueue, startMatch, error, clearError } = useArenaStore();
  const user = useAuthStore((s) => s.user);

  if (!isLobbyOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-[400px] max-h-[500px] overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">⚔️ 아레나</h2>
            <button onClick={closeLobby} className="text-white/80 hover:text-white text-xl">✕</button>
          </div>
          <p className="text-sm text-white/80 mt-1">전투 모드를 선택하세요</p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* 모드 목록 */}
        <div className="p-4 space-y-3">
          {MODES.map((mode) => {
            const config = ARENA_MODES[mode];
            const count = queueCounts[mode];
            const isQueued = inQueue && queueMode === mode;

            return (
              <div
                key={mode}
                className={`border rounded-xl p-4 transition-all ${
                  isQueued ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-800">
                      {ARENA_MODE_NAMES[mode]}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {mode === 'ffa'
                        ? `${config.minPlayers}~${config.maxPlayers}명`
                        : `${config.teamSize}v${config.teamSize}`}
                      {' · '}참가비 {config.entryFee}G
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      대기 중: {count}명
                    </p>
                  </div>

                  {isQueued ? (
                    <button
                      onClick={leaveQueue}
                      className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-300"
                    >
                      취소
                    </button>
                  ) : (
                    <button
                      onClick={() => joinQueue(mode)}
                      disabled={inQueue}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      참가
                    </button>
                  )}
                </div>

                {isQueued && (
                  <div className="mt-3">
                    {count >= config.minPlayers ? (
                      <button
                        onClick={startMatch}
                        className="w-full py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition-colors"
                      >
                        전투 시작! ({count}명 대기 중)
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-red-600">
                        <span className="animate-pulse">●</span>
                        대기 중... ({count}/{config.minPlayers}명)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 안내 */}
        <div className="px-4 pb-4">
          <p className="text-[10px] text-gray-400 text-center">
            보유 골드: {user?.gold ?? 0}G · 개인전은 2명 이상 모이면 30초 후 시작됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
