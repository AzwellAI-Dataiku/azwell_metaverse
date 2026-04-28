export interface QuestDefinition {
  id: number;
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
}

export interface QuestProgress {
  id: number;
  userId: number;
  questId: number;
  quest: QuestDefinition;
  progress: number;
  completed: boolean;
  date: string;
}

export const MAX_LEVEL = 30;

export interface LevelInfo {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  xpProgress: number;
  isMaxLevel: boolean;
}

export function calcXpForLevel(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function calcLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remainingXp = totalXp;

  while (level < MAX_LEVEL) {
    const needed = calcXpForLevel(level);
    if (remainingXp < needed) {
      return {
        level,
        currentXp: remainingXp,
        xpForNextLevel: needed,
        xpProgress: remainingXp / needed,
        isMaxLevel: false,
      };
    }
    remainingXp -= needed;
    level++;
  }

  return {
    level: MAX_LEVEL,
    currentXp: remainingXp,
    xpForNextLevel: 0,
    xpProgress: 1,
    isMaxLevel: true,
  };
}
