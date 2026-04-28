import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { useQuestStore } from '../../stores/questStore.js';
import LevelBadge from '../quest/LevelBadge.js';
import NicknameEditModal from './NicknameEditModal.js';
import CharacterEditorModal from '../character/CharacterEditorModal.js';

export default function PlayerInfo() {
  const user = useAuthStore((s) => s.user);
  const levelInfo = useQuestStore((s) => s.levelInfo);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCharEditOpen, setIsCharEditOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="panel-cy p-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsCharEditOpen(true)}
          className="text-3xl hover:scale-110 transition-transform"
          title="캐릭터 꾸미기"
        >
          🌰
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="font-bold text-cy-brown truncate">{user.nickname}</p>
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="text-cy-warm-gray hover:text-cy-brown text-sm leading-none"
              aria-label="닉네임 변경"
              title="닉네임 변경"
            >
              ✏️
            </button>
          </div>
          <LevelBadge level={user.level} xpProgress={levelInfo?.xpProgress ?? 0} />
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">💰</span>
            <span className="text-xs font-semibold text-yellow-600">{user.gold ?? 0} G</span>
          </div>
        </div>
      </div>
      <NicknameEditModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
      <CharacterEditorModal isOpen={isCharEditOpen} onClose={() => setIsCharEditOpen(false)} />
    </>
  );
}
