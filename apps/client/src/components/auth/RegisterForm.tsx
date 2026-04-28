import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, nickname);
      navigate('/character-create');
    } catch (err: any) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cy-pink flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-bounce-gentle">🌰</div>
          <h1 className="text-3xl font-bold text-cy-brown">회원가입</h1>
          <p className="text-cy-warm-gray mt-1">나만의 미니미를 만들어보세요!</p>
        </div>

        <form onSubmit={handleSubmit} className="panel-cy space-y-4">
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
            <label className="block text-sm font-medium text-cy-brown mb-1">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="input-cy"
              placeholder="2~20자"
              minLength={2}
              maxLength={20}
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
              placeholder="6자 이상"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cy-brown mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-cy"
              placeholder="비밀번호를 다시 입력하세요"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-cy-primary w-full text-lg disabled:opacity-50"
          >
            {loading ? '가입 중...' : '🌰 회원가입'}
          </button>

          <p className="text-center text-sm text-cy-warm-gray">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-cy-orange font-medium hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
