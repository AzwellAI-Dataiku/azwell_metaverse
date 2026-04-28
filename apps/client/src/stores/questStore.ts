import { create } from 'zustand';
import type { QuestProgress, LevelInfo } from '@metaverse/shared';

interface QuestState {
  dailyQuests: QuestProgress[];
  levelInfo: LevelInfo | null;
  setQuests: (quests: QuestProgress[]) => void;
  updateProgress: (progress: QuestProgress) => void;
  setLevelInfo: (info: LevelInfo) => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  dailyQuests: [],
  levelInfo: null,

  setQuests: (dailyQuests) => set({ dailyQuests }),

  updateProgress: (progress) =>
    set((state) => ({
      dailyQuests: state.dailyQuests.map((q) =>
        q.questId === progress.questId ? progress : q
      ),
    })),

  setLevelInfo: (levelInfo) => set({ levelInfo }),
}));
