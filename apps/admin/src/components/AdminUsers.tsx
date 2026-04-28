import { useEffect, useState } from 'react';
import * as adminApi from '../services/adminApi.js';
import type { AdminUser } from '../services/adminApi.js';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ nickname: '', level: 0, xp: 0, gold: 0 });

  const load = () => adminApi.getUsers().then(setUsers).catch(console.error);

  useEffect(() => { load(); }, []);

  const handleEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditForm({ nickname: u.nickname, level: u.level, xp: u.xp, gold: u.gold });
  };

  const handleSave = async () => {
    if (!editUser) return;
    try {
      await adminApi.updateUser(editUser.id, editForm);
      setEditUser(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || '수정 실패');
    }
  };

  const handleDelete = async (id: number, nickname: string) => {
    if (!confirm(`"${nickname}" 사용자를 삭제하시겠습니까?`)) return;
    try {
      await adminApi.deleteUser(id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleRoleToggle = async (u: AdminUser) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    const msg = newRole === 'admin'
      ? `"${u.nickname}"에게 관리자 권한을 부여하시겠습니까?`
      : `"${u.nickname}"의 관리자 권한을 해제하시겠습니까?`;
    if (!confirm(msg)) return;
    try {
      await adminApi.updateUserRole(u.id, newRole);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || '변경 실패');
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-cy-brown mb-4">사용자 관리</h2>
      <div className="panel-cy overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cy-pink text-left text-cy-warm-gray">
              <th className="p-2">ID</th>
              <th className="p-2">이메일</th>
              <th className="p-2">닉네임</th>
              <th className="p-2">레벨</th>
              <th className="p-2">XP</th>
              <th className="p-2">골드</th>
              <th className="p-2">역할</th>
              <th className="p-2">가입일</th>
              <th className="p-2">액션</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-cy-cream hover:bg-cy-pink/20">
                <td className="p-2 text-cy-brown">{u.id}</td>
                <td className="p-2 text-cy-brown">{u.email}</td>
                <td className="p-2 font-bold text-cy-brown">{u.nickname}</td>
                <td className="p-2 text-cy-brown">{u.level}</td>
                <td className="p-2 text-cy-brown">{u.xp}</td>
                <td className="p-2 text-yellow-600 font-medium">{u.gold}G</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    u.role === 'admin' ? 'bg-cy-coral text-white' : 'bg-cy-cream text-cy-warm-gray'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-2 text-cy-warm-gray text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(u)} className="px-2 py-1 rounded text-xs bg-cy-blue text-white hover:bg-cy-blue/80">
                      수정
                    </button>
                    <button onClick={() => handleRoleToggle(u)} className="px-2 py-1 rounded text-xs bg-cy-lavender text-cy-brown hover:bg-cy-lavender/80">
                      {u.role === 'admin' ? '권한해제' : '관리자'}
                    </button>
                    <button onClick={() => handleDelete(u.id, u.nickname)} className="px-2 py-1 rounded text-xs bg-red-100 text-red-600 hover:bg-red-200">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-cy-lg shadow-cy-lg p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cy-brown mb-3">사용자 수정 - {editUser.email}</h3>
            <label className="text-xs text-cy-warm-gray">닉네임</label>
            <input
              value={editForm.nickname}
              onChange={(e) => setEditForm((f) => ({ ...f, nickname: e.target.value }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <label className="text-xs text-cy-warm-gray">레벨</label>
            <input
              type="number"
              value={editForm.level}
              onChange={(e) => setEditForm((f) => ({ ...f, level: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <label className="text-xs text-cy-warm-gray">XP</label>
            <input
              type="number"
              value={editForm.xp}
              onChange={(e) => setEditForm((f) => ({ ...f, xp: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <label className="text-xs text-cy-warm-gray">골드</label>
            <input
              type="number"
              value={editForm.gold}
              onChange={(e) => setEditForm((f) => ({ ...f, gold: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-3"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditUser(null)} className="flex-1 py-1.5 rounded-cy text-sm text-cy-warm-gray hover:bg-cy-cream">
                취소
              </button>
              <button onClick={handleSave} className="flex-1 py-1.5 rounded-cy text-sm bg-cy-coral text-white font-bold">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
