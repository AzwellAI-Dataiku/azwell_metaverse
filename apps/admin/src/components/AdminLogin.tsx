import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const isAdmin = await login(email, password);
      if (isAdmin) {
        navigate('/');
      } else {
        setError('관리자 권한이 없는 계정입니다');
      }
    } catch {
      setError('이메일 또는 비밀번호가 올바르지 않습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cy-cream flex items-center justify-center p-4">
      <div className="panel-cy w-full max-w-sm">
        <h1 className="text-xl font-bold text-cy-brown text-center mb-1">🌰 관리자 로그인</h1>
        <p className="text-xs text-cy-warm-gray text-center mb-6">AzwellAI Metaverse Admin</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full px-4 py-2.5 rounded-cy border border-cy-pink text-sm focus:border-cy-coral outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full px-4 py-2.5 rounded-cy border border-cy-pink text-sm focus:border-cy-coral outline-none"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-cy bg-cy-coral text-white font-bold text-sm hover:bg-cy-coral/80 transition-all disabled:opacity-40"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
