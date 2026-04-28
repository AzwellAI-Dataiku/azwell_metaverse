import axios from 'axios';

const client = axios.create({ baseURL: '/api/admin' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AdminStats {
  users: number;
  online: number;
  messages: number;
  rooms: number;
  quests: number;
}

export async function getStats(): Promise<AdminStats> {
  const { data } = await client.get('/stats');
  return data;
}

export interface AdminUser {
  id: number;
  email: string;
  nickname: string;
  level: number;
  xp: number;
  gold: number;
  role: string;
  createdAt: string;
}

export async function getUsers(): Promise<AdminUser[]> {
  const { data } = await client.get('/users');
  return data;
}

export async function updateUser(id: number, body: { nickname?: string; level?: number; xp?: number; gold?: number }): Promise<AdminUser> {
  const { data } = await client.put(`/users/${id}`, body);
  return data;
}

export async function updateUserRole(id: number, role: 'user' | 'admin'): Promise<void> {
  await client.put(`/users/${id}/role`, { role });
}

export async function deleteUser(id: number): Promise<void> {
  await client.delete(`/users/${id}`);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await client.put('/password', { currentPassword, newPassword });
}

export interface AdminRoom {
  id: number;
  name: string;
  type: string;
  createdAt: string;
  memberCount: number;
  messageCount: number;
}

export async function getRooms(): Promise<AdminRoom[]> {
  const { data } = await client.get('/rooms');
  return data;
}

export async function deleteRoom(id: number): Promise<void> {
  await client.delete(`/rooms/${id}`);
}

export interface AdminMessage {
  id: number;
  senderId: number;
  senderNickname: string;
  roomId: number;
  content: string;
  createdAt: string;
}

export async function getRoomMessages(roomId: number): Promise<AdminMessage[]> {
  const { data } = await client.get(`/rooms/${roomId}/messages`);
  return data;
}

export async function deleteMessage(id: number): Promise<void> {
  await client.delete(`/messages/${id}`);
}

export interface AdminQuest {
  id: number;
  key: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
}

export async function getQuests(): Promise<AdminQuest[]> {
  const { data } = await client.get('/quests');
  return data;
}

export async function createQuest(body: Omit<AdminQuest, 'id'>): Promise<AdminQuest> {
  const { data } = await client.post('/quests', body);
  return data;
}

export async function updateQuest(id: number, body: Omit<AdminQuest, 'id'>): Promise<AdminQuest> {
  const { data } = await client.put(`/quests/${id}`, body);
  return data;
}

export async function deleteQuest(id: number): Promise<void> {
  await client.delete(`/quests/${id}`);
}
