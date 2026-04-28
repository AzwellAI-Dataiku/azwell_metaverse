import { useEffect } from 'react';
import { useQuestStore } from '../../stores/questStore.js';
import * as api from '../../services/api.js';

export default function QuestPanel() {
  const dailyQuests = useQuestStore((s) => s.dailyQuests);
  const setQuests = useQuestStore((s) => s.setQuests);

  useEffect(() => {
    api.getDailyQuests().then(setQuests).catch(console.error);
  }, [setQuests]);

  return (
    <div className="panel-cy p-3">
      <h3 className="text-sm font-bold text-cy-brown mb-2">📋 일일 퀘스트</h3>
      <div className="space-y-2">
        {dailyQuests.map((q) => (
          <div
            key={q.questId}
            className={`p-2 rounded-cy text-xs ${
              q.completed ? 'bg-cy-mint/30' : 'bg-cy-cream'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-cy-brown">
                {q.completed && '✨ '}{(q as any).quest?.title || '퀘스트'}
              </span>
              <span className="text-cy-orange font-bold">
                +{(q as any).quest?.xpReward || 0} XP
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((q.progress / ((q as any).quest?.target || 1)) * 100, 100)}%`,
                  backgroundColor: q.completed ? '#98DFAF' : '#FF8FA3',
                }}
              />
            </div>
            <p className="text-cy-warm-gray mt-0.5">
              {q.progress}/{(q as any).quest?.target || 0}
            </p>
          </div>
        ))}
        {dailyQuests.length === 0 && (
          <p className="text-xs text-cy-warm-gray text-center py-2">퀘스트를 불러오는 중...</p>
        )}
      </div>
    </div>
  );
}
