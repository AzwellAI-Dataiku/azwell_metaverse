export type Gender = 'male' | 'female';

export interface HairStyle {
  style: number;
  color: string;
}

export interface EyeStyle {
  style: number;
  color: string;
}

export interface NoseStyle {
  style: number;
}

export interface MouthStyle {
  style: number;
}

export interface BodyStyle {
  type: number;
  skinColor: string;
}

export interface OutfitStyle {
  style: number;
  color: string;
}

export interface CharacterAppearance {
  hair: HairStyle;
  eyes: EyeStyle;
  nose: NoseStyle;
  mouth: MouthStyle;
  body: BodyStyle;
  outfit: OutfitStyle;
}

export interface Character {
  id: number;
  userId: number;
  gender: Gender;
  appearance: CharacterAppearance;
  currentFloor: number;
  positionX: number;
  positionY: number;
  isSitting: boolean;
}

export const DEFAULT_APPEARANCE: CharacterAppearance = {
  hair: { style: 1, color: '#8B4513' },
  eyes: { style: 1, color: '#2E4057' },
  nose: { style: 1 },
  mouth: { style: 1 },
  body: { type: 1, skinColor: '#FFDBB5' },
  outfit: { style: 1, color: '#FF8FA3' },
};
