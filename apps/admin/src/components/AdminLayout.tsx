import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import * as adminApi from '../services/adminApi.js';

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊', end: true },
  { to: '/users', label: '사용자 관리', icon: '👥', end: false },
  { to: '/quests', label: '퀘스트 관리', icon: '🎯', end: false },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePw = async () => {
    setPwError('');
    setPwSuccess(false);
    try {
      await adminApi.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => setShowPwModal(false), 1500);
    } catch (err: any) {
      setPwError(err.response?.data?.error || '변경 실패');
    }
  };

  return (
    <div className="min-h-screen bg-cy-cream flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white shadow-cy min-h-screen flex flex-col">
        <div className="p-4 border-b border-cy-pink">
          <h1 className="text-lg font-bold text-cy-brown">🌰 관리자</h1>
          <p className="text-[10px] text-cy-warm-gray">localhost:3001</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-cy text-sm transition-all ${
                  isActive
                    ? 'bg-cy-coral text-white font-bold'
                    : 'text-cy-brown hover:bg-cy-pink'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-cy-pink space-y-1">
          <button
            onClick={() => { setShowPwModal(true); setPwError(''); setPwSuccess(false); setCurrentPw(''); setNewPw(''); }}
            className="w-full text-left px-3 py-2 rounded-cy text-sm text-cy-brown hover:bg-cy-pink transition-all"
          >
            🔑 비밀번호 변경
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-cy text-sm text-cy-warm-gray hover:bg-cy-pink transition-all"
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>

      {/* Password Change Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPwModal(false)}>
          <div className="bg-white rounded-cy-lg shadow-cy-lg p-5 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-cy-brown mb-3">비밀번호 변경</h3>
            <input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              placeholder="현재 비밀번호"
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-2"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="새 비밀번호 (6자 이상)"
              className="w-full px-3 py-2 rounded-cy border border-cy-pink text-sm mb-3"
            />
            {pwError && <p className="text-xs text-red-500 mb-2">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-green-600 mb-2">변경 완료!</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowPwModal(false)} className="flex-1 py-1.5 rounded-cy text-sm text-cy-warm-gray hover:bg-cy-cream">
                취소
              </button>
              <button
                onClick={handleChangePw}
                disabled={!currentPw || newPw.length < 6}
                className="flex-1 py-1.5 rounded-cy text-sm bg-cy-coral text-white font-bold disabled:opacity-40"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
