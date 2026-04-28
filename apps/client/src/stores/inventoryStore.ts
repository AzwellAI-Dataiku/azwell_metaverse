import { create } from 'zustand';
import type { InventoryItemResponse } from '../services/api.js';
import * as api from '../services/api.js';

interface InventoryState {
  items: InventoryItemResponse[];
  isOpen: boolean;
  loading: boolean;

  openInventory: () => void;
  closeInventory: () => void;
  fetchInventory: () => Promise<void>;
  equip: (inventoryId: number) => Promise<void>;
  unequip: (inventoryId: number) => Promise<void>;
  sell: (inventoryId: number, quantity?: number) => Promise<void>;
  lastSellGold: number | null;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  isOpen: false,
  loading: false,
  lastSellGold: null,

  openInventory: () => {
    set({ isOpen: true });
    // 열 때 자동으로 fetch
    useInventoryStore.getState().fetchInventory();
  },

  closeInventory: () => set({ isOpen: false }),

  fetchInventory: async () => {
    set({ loading: true });
    try {
      const items = await api.getInventory();
      set({ items, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  equip: async (inventoryId) => {
    try {
      const items = await api.equipItem(inventoryId);
      set({ items });
    } catch {
      // 에러 시 무시
    }
  },

  unequip: async (inventoryId) => {
    try {
      const items = await api.unequipItem(inventoryId);
      set({ items });
    } catch {
      // 에러 시 무시
    }
  },

  sell: async (inventoryId, quantity) => {
    try {
      const { items, goldEarned } = await api.sellItem(inventoryId, quantity);
      set({ items, lastSellGold: goldEarned });
      // 3초 후 알림 제거
      setTimeout(() => {
        useInventoryStore.setState({ lastSellGold: null });
      }, 3000);
    } catch {
      // 에러 시 무시
    }
  },
}));
