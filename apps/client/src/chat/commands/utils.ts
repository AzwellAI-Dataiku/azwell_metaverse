import { getSocket } from '../../services/socket.js';
import { useChatStore } from '../../stores/chatStore.js';
import { useMemberStore } from '../../stores/memberStore.js';
import { useAuthStore } from '../../stores/authStore.js';
import * as api from '../../services/api.js';

export function requireSocket() {
  const socket = getSocket();
  if (!socket) throw new Error('소켓 연결이 없습니다');
  return socket;
}

/** Resolve a member by nickname (case-insensitive). */
export function findMemberByNickname(nickname: string) {
  const target = nickname.trim().toLowerCase();
  return useMemberStore.getState().members.find((m) => m.nickname.toLowerCase() === target);
}

/**
 * Find existing DM room between the current user and target, or null if none.
 * The server's DM rooms are shared across both parties once created.
 */
export function findDmRoomWith(targetUserId: number): number | null {
  const me = useAuthStore.getState().user;
  if (!me) return null;
  const rooms = useChatStore.getState().rooms;
  const dm = rooms.find(
    (r) =>
      r.type === 'dm' &&
      r.members.length === 2 &&
      r.members.includes(me.id) &&
      r.members.includes(targetUserId)
  );
  return dm ? dm.id : null;
}

/**
 * Ensure a DM room exists for {targetUserId}, returning its roomId.
 * Creates one and refreshes the local room list if not found.
 */
export async function ensureDmRoomWith(targetUserId: number): Promise<number> {
  const existing = findDmRoomWith(targetUserId);
  if (existing !== null) return existing;

  await api.createDM(targetUserId);
  const rooms = await api.getChatRooms();
  useChatStore.getState().setRooms(rooms);

  const created = findDmRoomWith(targetUserId);
  if (created === null) {
    throw new Error('DM 방 생성 후에도 찾을 수 없습니다');
  }
  return created;
}
