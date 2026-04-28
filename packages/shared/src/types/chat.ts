export type ChatRoomType = 'dm' | 'group';

export interface ChatRoom {
  id: number;
  name: string;
  type: ChatRoomType;
  members: number[];
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderNickname: string;
  roomId: number | null;
  content: string;
  floor: number | null;
  createdAt: string;
}

export interface CreateGroupRequest {
  name: string;
  memberIds: number[];
}
