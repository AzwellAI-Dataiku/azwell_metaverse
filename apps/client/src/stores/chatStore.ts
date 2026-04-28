import { create } from 'zustand';
import type { ChatMessage, ChatRoom } from '@metaverse/shared';

type ChatTab = 'public' | 'dm' | 'group';

interface UnreadCounts {
  public: number;
  dm: number;
  group: number;
}

interface ChatState {
  messages: ChatMessage[];
  rooms: ChatRoom[];
  activeTab: ChatTab;
  activeRoomId: number | null;
  isOpen: boolean;
  /** Most recent DM sender (excluding self) — used by /r reply command. */
  lastDmSenderId: number | null;
  unread: UnreadCounts;
  addMessage: (msg: ChatMessage) => void;
  /** Replace all messages for a specific room (or public/floor). Prevents duplicates on re-entry. */
  loadRoomMessages: (roomId: number | null, msgs: ChatMessage[]) => void;
  /** Clear public messages (used on floor change). */
  clearPublicMessages: () => void;
  /** Increment unread count for a tab. */
  incrementUnread: (tab: ChatTab) => void;
  setRooms: (rooms: ChatRoom[]) => void;
  setActiveTab: (tab: ChatTab) => void;
  setActiveRoom: (roomId: number | null) => void;
  toggleOpen: () => void;
  setLastDmSender: (userId: number | null) => void;
  removeMessage: (messageId: number) => void;
  removeRoom: (roomId: number) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  rooms: [],
  activeTab: 'public',
  activeRoomId: null,
  isOpen: true,
  lastDmSenderId: null,
  unread: { public: 0, dm: 0, group: 0 },

  addMessage: (msg) =>
    set((state) => {
      // Deduplicate by message id
      if (state.messages.some((m) => m.id === msg.id)) return state;
      return { messages: [...state.messages.slice(-500), msg] };
    }),

  loadRoomMessages: (roomId, msgs) =>
    set((state) => {
      // Remove existing messages for this room, then add the new batch
      const other = state.messages.filter((m) => m.roomId !== roomId);
      // Deduplicate incoming messages by id
      const seen = new Set<number>();
      const unique = msgs.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      return { messages: [...other, ...unique] };
    }),

  clearPublicMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => m.roomId !== null),
    })),

  incrementUnread: (tab) =>
    set((state) => ({
      unread: { ...state.unread, [tab]: state.unread[tab] + 1 },
    })),

  setRooms: (rooms) => set({ rooms }),
  setActiveTab: (activeTab) =>
    set((state) => ({
      activeTab,
      activeRoomId: null,
      unread: { ...state.unread, [activeTab]: 0 },
    })),
  setActiveRoom: (activeRoomId) => set({ activeRoomId }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  setLastDmSender: (userId) => set({ lastDmSenderId: userId }),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),
  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
      messages: state.messages.filter((m) => m.roomId !== roomId),
      activeRoomId: state.activeRoomId === roomId ? null : state.activeRoomId,
    })),
  clearMessages: () => set({ messages: [] }),
}));
