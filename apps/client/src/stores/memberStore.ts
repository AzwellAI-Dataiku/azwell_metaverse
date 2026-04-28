import { create } from 'zustand';
import type { MemberSummary, PresenceInfo } from '@metaverse/shared';

interface MemberState {
  members: MemberSummary[];
  setMembers: (members: MemberSummary[]) => void;
  addMember: (member: Omit<MemberSummary, 'presence'> & { presence?: PresenceInfo | null }) => void;
  setOnline: (userId: number, isOnline: boolean) => void;
  setNickname: (userId: number, nickname: string) => void;
  setPresence: (userId: number, presence: PresenceInfo | null) => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  members: [],

  setMembers: (members) => set({ members }),

  addMember: (member) =>
    set((state) =>
      state.members.some((m) => m.id === member.id)
        ? state
        : {
            members: [
              ...state.members,
              { ...member, presence: member.presence ?? null } as MemberSummary,
            ],
          }
    ),

  setOnline: (userId, isOnline) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === userId
          ? { ...m, isOnline, presence: isOnline ? m.presence : null }
          : m
      ),
    })),

  setNickname: (userId, nickname) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === userId ? { ...m, nickname } : m)),
    })),

  setPresence: (userId, presence) =>
    set((state) => ({
      members: state.members.map((m) => (m.id === userId ? { ...m, presence } : m)),
    })),
}));
