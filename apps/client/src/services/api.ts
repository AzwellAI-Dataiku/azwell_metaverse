import axios from 'axios';
import type { AuthResponse, Character, ChatRoom, ChatMessage, QuestProgress, User, MemberSummary } from '@metaverse/shared';

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function register(email: string, password: string, nickname: string): Promise<AuthResponse> {
  const { data } = await client.post('/auth/register', { email, password, nickname });
  return data;
}

export async function updateNickname(nickname: string): Promise<User> {
  const { data } = await client.put('/auth/nickname', { nickname });
  return data;
}

export async function getMembers(): Promise<MemberSummary[]> {
  const { data } = await client.get('/users');
  return data;
}

export interface LocateResult {
  userId: number;
  nickname: string;
  isOnline: boolean;
  floor: number | null;
  presence: { mode: 'available' | 'busy' | 'afk'; message: string | null; brbUntil: number | null } | null;
}

export async function locateUser(nickname: string): Promise<LocateResult> {
  const { data } = await client.get('/users/locate', { params: { nickname } });
  return data;
}

export async function getCharacter(): Promise<Character | null> {
  try {
    const { data } = await client.get('/characters/me');
    return data;
  } catch {
    return null;
  }
}

export async function updateCharacter(gender: string, appearance: any): Promise<Character> {
  const { data } = await client.put('/characters/me', { gender, appearance });
  return data;
}

export async function getChatRooms(): Promise<ChatRoom[]> {
  const { data } = await client.get('/chat/rooms');
  return data;
}

export async function getChatHistory(roomId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
  const { data } = await client.get(`/chat/rooms/${roomId}/messages`, { params: { limit, offset } });
  return data;
}

export async function createGroupChat(name: string, memberIds: number[]): Promise<ChatRoom> {
  const { data } = await client.post('/chat/rooms/group', { name, memberIds });
  return data;
}

export async function getOnlineUsers(): Promise<Array<{ id: number; nickname: string }>> {
  const { data } = await client.get('/chat/online-users');
  return data;
}

export async function createDM(targetUserId: number): Promise<ChatRoom> {
  const { data } = await client.post('/chat/rooms/dm', { targetUserId });
  return data;
}

export async function getDailyQuests(): Promise<QuestProgress[]> {
  const { data } = await client.get('/quests/daily');
  return data;
}

export async function deleteRoom(roomId: number): Promise<void> {
  await client.delete(`/chat/rooms/${roomId}`);
}

export async function getPublicChatHistory(floor: number, limit = 50): Promise<ChatMessage[]> {
  const { data } = await client.get(`/chat/public/${floor}`, { params: { limit } });
  return data;
}

export async function adminDeleteMessage(messageId: number): Promise<void> {
  await client.delete(`/admin/messages/${messageId}`);
}

// ── 인벤토리 API ──

export interface InventoryItemResponse {
  id: number;
  itemDefId: number;
  quantity: number;
  durability: number;
  equipped: boolean;
  isDefault: boolean;
  definition: import('@metaverse/shared').ItemDefinition;
}

export async function getInventory(): Promise<InventoryItemResponse[]> {
  const { data } = await client.get('/inventory');
  return data;
}

export async function equipItem(inventoryId: number): Promise<InventoryItemResponse[]> {
  const { data } = await client.post('/inventory/equip', { inventoryId });
  return data;
}

export async function unequipItem(inventoryId: number): Promise<InventoryItemResponse[]> {
  const { data } = await client.post('/inventory/unequip', { inventoryId });
  return data;
}

export async function sellItem(inventoryId: number, quantity?: number): Promise<{ items: InventoryItemResponse[]; goldEarned: number }> {
  const { data } = await client.post('/inventory/sell', { inventoryId, quantity });
  return data;
}
