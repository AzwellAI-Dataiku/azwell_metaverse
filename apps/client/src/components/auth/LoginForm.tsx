import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/game');
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cy-pink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-bounce-gentle">🌰</div>
          <h1 className="text-3xl font-bold text-cy-brown">Company Metaverse</h1>
          <p className="text-cy-warm-gray mt-1">우리 회사의 가상 사무실에 오신 것을 환영합니다</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="panel-cy space-y-5">
          <h2 className="text-xl font-bold text-cy-brown text-center">로그인</h2>

          {error && (
            <div className="bg-red-50 text-red-500 text-sm px-4 py-2 rounded-cy border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-cy-brown mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-cy"
              placeholder="email@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cy-brown mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-cy"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cy-primary w-full text-lg disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '🌰 로그인'}
          </button>

          <p className="text-center text-sm text-cy-warm-gray">
            아직 계정이 없으신가요?{' '}
            <Link to="/register" className="text-cy-orange font-medium hover:underline">
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
