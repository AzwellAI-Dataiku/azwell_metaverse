import { useEffect, useState } from 'react';
import * as adminApi from '../services/adminApi.js';
import type { AdminQuest } from '../services/adminApi.js';

const EMPTY_FORM = { key: '', title: '', description: '', target: 1, xpReward: 10 };

export default function AdminQuests() {
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const load = () => adminApi.getQuests().then(setQuests).catch(console.error);

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (q: AdminQuest) => {
    setEditId(q.id);
    setForm({ key: q.key, title: q.title, description: q.description, target: q.target, xpReward: q.xpReward });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    try {
      if (editId) {
        await adminApi.updateQuest(editId, form);
      } else {
        await adminApi.createQuest(form);
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || '저장 실패');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`"${title}" 퀘스트를 삭제하시겠습니까?`)) return;
    try {
      await adminApi.deleteQuest(id);
      load();
    } catch {
      alert('삭제 실패');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-cy-brown">퀘스트 관리</h2>
        <button onClick={openCreate} className="px-4 py-2 rounded-cy bg-cy-coral text-white text-sm font-bold hover:bg-cy-coral/80">
          + 퀘스트 추가
        </button>
      </div>

      <div className="panel-cy overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cy-pink text-left text-cy-warm-gray">
              <th className="p-2">ID</th>
              <th className="p-2">키</th>
              <th className="p-2">제목</th>
              <th className="p-2">설명</th>
              <th className="p-2">목표</th>
              <th className="p-2">XP 보상</th>
              <th className="p-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {quests.map((q) => (
              <tr key={q.id} className="border-b border-cy-cream hover:bg-cy-pink/20">
                <td className="p-2 text-cy-brown">{q.id}</td>
                <td className="p-2 text-cy-brown font-mono text-xs">{q.key}</td>
                <td className="p-2 font-bold text-cy-brown">{q.title}</td>
                <td className="p-2 text-cy-warm-gray text-xs max-w-[200px] truncate">{q.description}</td>
                <td className="p-2 text-cy-brown">{q.target}</td>
                <td className="p-2 text-cy-brown">{q.xpReward}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(q)} className="px-2 py-1 rounded text-xs bg-cy-blue text-white hover:bg-cy-blue/80">
                      수정
                    </button>
                    <button onClick={() => handleDelete(q.id, q.title)} className="px-2 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {quests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-cy-warm-gray text-xs">퀘스트가 없습니다</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-cy-lg shadow-cy-lg p-5 w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cy-brown mb-3">
              {editId ? '퀘스트 수정' : '퀘스트 추가'}
            </h3>
            <label className="text-xs text-cy-warm-gray">키 (고유)</label>
            <input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
              placeholder="예: daily_chat"
            />
            <label className="text-xs text-cy-warm-gray">제목</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <label className="text-xs text-cy-warm-gray">설명</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <label className="text-xs text-cy-warm-gray">목표</label>
                <input
                  type="number"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-cy-warm-gray">XP 보상</label>
                <input
                  type="number"
                  value={form.xpReward}
                  onChange={(e) => setForm((f) => ({ ...f, xpReward: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-1.5 rounded-cy text-sm text-cy-warm-gray hover:bg-cy-cream">
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!form.key || !form.title}
                className="flex-1 py-1.5 rounded-cy text-sm bg-cy-coral text-white font-bold disabled:opacity-40"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
