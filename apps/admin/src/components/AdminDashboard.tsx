import { useEffect, useState } from 'react';
import * as adminApi from '../services/adminApi.js';
import type { AdminStats } from '../services/adminApi.js';

const CARDS = [
  { key: 'users' as const, label: '전체 사용자', icon: '👥' },
  { key: 'online' as const, label: '온라인', icon: '🟢' },
  { key: 'messages' as const, label: '총 메시지', icon: '💬' },
  { key: 'rooms' as const, label: '채팅방', icon: '🏠' },
  { key: 'quests' as const, label: '퀘스트', icon: '🎯' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-cy-brown mb-4">대시보드</h2>
      {!stats ? (
        <p className="text-cy-warm-gray">로딩 중...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CARDS.map((card) => (
            <div key={card.key} className="panel-cy p-4 text-center">
              <div className="text-2xl mb-1">{card.icon}</div>
              <div className="text-2xl font-bold text-cy-brown">{stats[card.key]}</div>
              <div className="text-xs text-cy-warm-gray">{card.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
