import { create } from 'zustand';
import type { PlayerState } from '@metaverse/shared';

interface GameState {
  currentFloor: number;
  players: Map<number, PlayerState>;
  setFloor: (floor: number) => void;
  setPlayers: (players: PlayerState[]) => void;
  updatePlayer: (player: PlayerState) => void;
  removePlayer: (userId: number) => void;
  movePlayer: (userId: number, x: number, y: number, direction: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentFloor: 2,
  players: new Map(),

  setFloor: (floor) => set({ currentFloor: floor, players: new Map() }),

  setPlayers: (players) => {
    const map = new Map<number, PlayerState>();
    players.forEach((p) => map.set(p.userId, p));
    set({ players: map });
  },

  updatePlayer: (player) =>
    set((state) => {
      const next = new Map(state.players);
      next.set(player.userId, player);
      return { players: next };
    }),

  removePlayer: (userId) =>
    set((state) => {
      const next = new Map(state.players);
      next.delete(userId);
      return { players: next };
    }),

  movePlayer: (userId, x, y, direction) =>
    set((state) => {
      const player = state.players.get(userId);
      if (!player) return state;
      const next = new Map(state.players);
      next.set(userId, { ...player, x, y, direction: direction as any });
      return { players: next };
    }),
}));
