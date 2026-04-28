// ── 전투 행동 ──

export type CombatAction = 'shoot' | 'rush' | 'defend' | 'potion' | 'counter';

export const COMBAT_ACTION_NAMES: Record<CombatAction, string> = {
  shoot: '총 공격',
  rush: '돌격 (칼)',
  defend: '방어',
  potion: '물약',
  counter: '카운터',
};

export const COMBAT_ACTION_ICONS: Record<CombatAction, string> = {
  shoot: '🔫',
  rush: '🗡️',
  defend: '🛡️',
  potion: '🧪',
  counter: '⚡',
};

// ── 5×5 행동 결정 매트릭스 ──
// 결과: [공격자에게 적용할 데미지 배율, 방어자에게 적용할 데미지 배율]
// 양수 = 피해 입음, 음수 = 회복 (사용 안 함, heal은 별도 처리)
// 0 = 무행동

export interface ActionResult {
  /** 행(row) 유저가 받는 데미지 배율 (자신의 공격력 기준) */
  attackerDamageMultiplier: number;
  /** 열(col) 유저가 받는 데미지 배율 (row 유저의 공격력 기준) */
  defenderDamageMultiplier: number;
  /** 결과 설명 */
  description: string;
}

/**
 * COMBAT_MATRIX[attacker_action][defender_action] = ActionResult
 *
 * 상성 삼각: 총 > 칼 > 방어 > 총
 * 카운터: 공격(총)에 강하지만 비공격 행동에는 턴 낭비
 * 물약: 공격당하면 추가 피해(130%)
 */
export const COMBAT_MATRIX: Record<CombatAction, Record<CombatAction, ActionResult>> = {
  shoot: {
    shoot: {
      attackerDamageMultiplier: 1.0,
      defenderDamageMultiplier: 1.0,
      description: '양측 교전 — 서로 공격력 100% 피해',
    },
    rush: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 1.5,
      description: '총 승리 — 돌격자에게 150% 피해',
    },
    defend: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0.5,
      description: '방어 승리 — 데미지 50% 감소',
    },
    potion: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 1.3,
      description: '총 승리 — 물약 사용자에게 130% 피해',
    },
    counter: {
      attackerDamageMultiplier: 1.2,
      defenderDamageMultiplier: 0,
      description: '카운터 승리 — 반격 120% 피해',
    },
  },
  rush: {
    shoot: {
      attackerDamageMultiplier: 1.5,
      defenderDamageMultiplier: 0,
      description: '총 승리 — 돌격자에게 150% 피해',
    },
    rush: {
      attackerDamageMultiplier: 1.0,
      defenderDamageMultiplier: 1.0,
      description: '양측 난전 — 서로 공격력 100% 피해',
    },
    defend: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 1.0,
      description: '칼 승리 — 방어 무시, 100% 피해',
    },
    potion: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 1.3,
      description: '칼 승리 — 물약 사용자에게 130% 피해',
    },
    counter: {
      attackerDamageMultiplier: 0.8,
      defenderDamageMultiplier: 0.8,
      description: '양측 피해 — 서로 80% 피해',
    },
  },
  defend: {
    shoot: {
      attackerDamageMultiplier: 0.5,
      defenderDamageMultiplier: 0,
      description: '방어 승리 — 데미지 50% 감소',
    },
    rush: {
      attackerDamageMultiplier: 1.0,
      defenderDamageMultiplier: 0,
      description: '칼 승리 — 방어 무시, 100% 피해',
    },
    defend: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '양측 방어 — 아무 일도 일어나지 않음',
    },
    potion: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '양측 무행동 — 물약 회복만 적용',
    },
    counter: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '카운터 빗나감 — 양측 무행동',
    },
  },
  potion: {
    shoot: {
      attackerDamageMultiplier: 1.3,
      defenderDamageMultiplier: 0,
      description: '총 승리 — 물약 사용자에게 130% 피해',
    },
    rush: {
      attackerDamageMultiplier: 1.3,
      defenderDamageMultiplier: 0,
      description: '칼 승리 — 물약 사용자에게 130% 피해',
    },
    defend: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '양측 무행동 — 물약 회복만 적용',
    },
    potion: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '양측 회복 — 서로 물약 회복 적용',
    },
    counter: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '카운터 빗나감 — 물약 회복만 적용',
    },
  },
  counter: {
    shoot: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 1.2,
      description: '카운터 승리 — 반격 120% 피해',
    },
    rush: {
      attackerDamageMultiplier: 0.8,
      defenderDamageMultiplier: 0.8,
      description: '양측 피해 — 서로 80% 피해',
    },
    defend: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '카운터 빗나감 — 양측 무행동',
    },
    potion: {
      attackerDamageMultiplier: 0,
      defenderDamageMultiplier: 0,
      description: '카운터 빗나감 — 물약 회복만 적용',
    },
    counter: {
      attackerDamageMultiplier: 0.5,
      defenderDamageMultiplier: 0.5,
      description: '양측 카운터 — 서로 50% 피해',
    },
  },
};

// ── 퇴행 전략 방지 ──

/** 연속 방어 시 효과 감쇠 (인덱스 = 연속 횟수 - 1) */
export const CONSECUTIVE_DEFEND_MULTIPLIERS = [1.0, 0.7, 0.4];

/** 매치당 물약 사용 최대 횟수 */
export const MAX_POTION_USES_PER_MATCH = 2;

// ── 아레나 모드 ──

export type ArenaMode = 'ffa' | 'team_2v2' | 'team_3v3';

export const ARENA_MODE_NAMES: Record<ArenaMode, string> = {
  ffa: '개인전',
  team_2v2: '2v2 팀전',
  team_3v3: '3v3 팀전',
};

export interface ArenaModeConfig {
  mode: ArenaMode;
  minPlayers: number;
  maxPlayers: number;
  teamSize: number;
  teamCount: number;
  entryFee: number;
}

export const ARENA_MODES: Record<ArenaMode, ArenaModeConfig> = {
  ffa: {
    mode: 'ffa',
    minPlayers: 2,
    maxPlayers: 8,
    teamSize: 1,
    teamCount: 0,
    entryFee: 30,
  },
  team_2v2: {
    mode: 'team_2v2',
    minPlayers: 4,
    maxPlayers: 4,
    teamSize: 2,
    teamCount: 2,
    entryFee: 30,
  },
  team_3v3: {
    mode: 'team_3v3',
    minPlayers: 6,
    maxPlayers: 6,
    teamSize: 3,
    teamCount: 2,
    entryFee: 30,
  },
};

// ── 전투 상수 ──

/** 매칭 카운트다운 (초) */
export const MATCH_COUNTDOWN_SECONDS = 30;

/** 레디 체크 제한 시간 (초, 팀전만) */
export const READY_CHECK_SECONDS = 10;

/** 재접속 대기 시간 (초) */
export const RECONNECT_TIMEOUT_SECONDS = 30;

/** 매치 제한시간 (초) */
export const MATCH_DURATION_SECONDS = 120;

/** 서버 틱 간격 (ms) */
export const SERVER_TICK_MS = 200;

// ── 리얼타임 스킬 쿨타임 (ms) ──

export const SHOOT_COOLDOWN_MS = 500;
export const RUSH_COOLDOWN_MS = 1000;
export const DEFEND_COOLDOWN_MS = 5000;
export const DEFEND_DURATION_MS = 1500;
export const DEFEND_DAMAGE_REDUCTION = 0.5;

/** 물약 사용 횟수 제한 (매치당) */
export const MAX_POTION_PER_MATCH = 2;
/** 물약 회복 비율 (최대 HP의 %) */
export const POTION_HEAL_RATIO = 0.25;

// ── 투사체 상수 ──

/** 총알 속도 (px/s) */
export const BULLET_SPEED = 400;
/** 총알 사거리 (px) */
export const BULLET_RANGE = 300;
/** 총알 크기 (px) */
export const BULLET_SIZE = 6;

/** 칼 범위 (px) */
export const SLASH_RANGE = 60;
/** 칼 부채꼴 각도 (도) */
export const SLASH_ARC_DEG = 120;
/** 칼 데미지 배율 (공격력 기준) */
export const SLASH_DAMAGE_MULT = 1.5;

// ── 아레나 맵 상수 ──

export const ARENA_MAP_W = 800;   // px
export const ARENA_MAP_H = 600;   // px
export const ARENA_TILE_SIZE = 48;
export const PLAYER_SIZE = 24;    // 히트박스 반지름

// ── HP 계산 ──

export const BASE_HP = 100;
export const HP_PER_LEVEL = 5;
export const MAX_HP_CAP = 300;
export const DEFENSE_TO_HP_RATIO = 2;

export function calcCombatHp(level: number, defense: number): number {
  const baseHp = BASE_HP + level * HP_PER_LEVEL;
  const bonusHp = defense * DEFENSE_TO_HP_RATIO;
  return Math.min(baseHp + bonusHp, MAX_HP_CAP);
}

// ── 레벨 구간 매칭 ──

export type ArenaRankTier = 'bronze' | 'silver' | 'gold';

export const ARENA_RANK_TIERS: { tier: ArenaRankTier; minLevel: number; maxLevel: number; name: string }[] = [
  { tier: 'bronze', minLevel: 1, maxLevel: 10, name: '브론즈' },
  { tier: 'silver', minLevel: 11, maxLevel: 20, name: '실버' },
  { tier: 'gold', minLevel: 21, maxLevel: 30, name: '골드' },
];

/** 구간 차이 매칭 시 낮은 구간 HP 보정 비율 */
export const CROSS_TIER_HP_BONUS = 0.15;

export function getArenaRankTier(level: number): ArenaRankTier {
  if (level <= 10) return 'bronze';
  if (level <= 20) return 'silver';
  return 'gold';
}

// ── 상금 분배 ──

/** 개인전 상금 비율 (1위, 2위, 3위) */
export const FFA_PRIZE_RATIOS = [0.50, 0.30, 0.20];

/** 팀전 상금 비율 (승리팀, 패배팀) */
export const TEAM_PRIZE_RATIOS = { winners: 0.80, losers: 0.20 };

// ── 미선택 시 랜덤 행동 가중치 ──

export const AFK_ACTION_WEIGHTS: Record<CombatAction, number> = {
  shoot: 0.30,
  rush: 0.20,
  defend: 0.50,
  potion: 0,
  counter: 0,
};
