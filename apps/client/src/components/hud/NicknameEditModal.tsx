import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore.js';

interface NicknameEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NicknameEditModal({ isOpen, onClose }: NicknameEditModalProps) {
  const user = useAuthStore((s) => s.user);
  const updateNickname = useAuthStore((s) => s.updateNickname);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(user?.nickname ?? '');
      setError('');
    }
  }, [isOpen, user?.nickname]);

  if (!isOpen || !user) return null;

  const trimmed = nickname.trim();
  const isValid = trimmed.length >= 2 && trimmed.length <= 20;
  const isUnchanged = trimmed === user.nickname;
  const canSubmit = isValid && !isUnchanged && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError('');
    setLoading(true);
    try {
      await updateNickname(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || '닉네임 변경에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="panel-cy w-full max-w-sm space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold text-cy-brown">닉네임 변경</h2>
          <p className="text-xs text-cy-warm-gray mt-1">2~20자로 입력해주세요.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm px-4 py-2 rounded-cy border border-red-200">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-cy-brown mb-1">새 닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input-cy"
            placeholder="2~20자"
            minLength={2}
            maxLength={20}
            autoFocus
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-cy-secondary flex-1 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-cy-primary flex-1 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
