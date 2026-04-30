import type { Server, Socket } from 'socket.io';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { messages, users, chatRooms, chatRoomMembers } from '../../db/schema/index.js';
import { incrementProgress } from '../../services/questService.js';
import { getPresence } from '../presence.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('chat:public', async (data) => {
    const { content } = data;
    const floor = socket.data.floor as number;

    const [user] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, userId));
    if (!user) return;

    const [msg] = await db
      .insert(messages)
      .values({ senderId: userId, content, floor })
      .returning();

    const chatMsg = {
      id: msg.id,
      senderId: userId,
      senderNickname: user.nickname,
      roomId: null,
      content,
      floor,
      createdAt: msg.createdAt.toISOString(),
    };

    io.to(`floor:${floor}`).emit('chat:public', chatMsg);
    await incrementProgress(userId, 'send_messages', io, socket.id);
  });

  socket.on('chat:private', async (data) => {
    const { roomId, content } = data;

    const [user] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, userId));
    if (!user) return;

    const [msg] = await db
      .insert(messages)
      .values({ senderId: userId, roomId, content })
      .returning();

    const chatMsg = {
      id: msg.id,
      senderId: userId,
      senderNickname: user.nickname,
      roomId,
      content,
      floor: null,
      createdAt: msg.createdAt.toISOString(),
    };

    const members = await db
      .select({ userId: chatRoomMembers.userId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.roomId, roomId));

    // 룸 기반 전송 — 전체 소켓 스캔 대신 user:{id} 룸으로 직접 전송
    for (const m of members) {
      io.to(`user:${m.userId}`).emit('chat:private', chatMsg);
    }

    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    if (room?.type === 'group') {
      await incrementProgress(userId, 'group_chat', io, socket.id);
    }

    // Busy auto-reply: 배치 쿼리로 닉네임 일괄 조회
    const busyMemberIds: number[] = [];
    for (const m of members) {
      if (m.userId === userId) continue;
      const presence = getPresence(m.userId);
      if (presence?.mode === 'busy') {
        busyMemberIds.push(m.userId);
      }
    }
    if (busyMemberIds.length > 0) {
      const busyUsers = await db
        .select({ id: users.id, nickname: users.nickname })
        .from(users)
        .where(inArray(users.id, busyMemberIds));

      const nicknameMap = new Map(busyUsers.map((u) => [u.id, u.nickname]));
      const busyRecipients = busyMemberIds.map((uid) => {
        const presence = getPresence(uid);
        const suffix = presence?.message ? `: "${presence.message}"` : '';
        return `${nicknameMap.get(uid) ?? `#${uid}`}${suffix}`;
      });

      socket.emit('chat:system', {
        roomId,
        content: `수신자가 방해 금지 모드입니다 — ${busyRecipients.join(', ')}`,
      });
    }
  });

  socket.on('chat:typing', (data) => {
    if (!data.isPublic) return;
    const floor = socket.data.floor as number | undefined;
    if (floor === undefined) return;
    socket.to(`floor:${floor}`).emit('chat:typing', { userId, isTyping: true });
  });

  socket.on('chat:stop-typing', () => {
    const floor = socket.data.floor as number | undefined;
    if (floor !== undefined) {
      socket.to(`floor:${floor}`).emit('chat:typing', { userId, isTyping: false });
    }
  });

  socket.on('chat:create-dm', async (data) => {
    const { targetUserId } = data;
    const [room] = await db.insert(chatRooms).values({ name: null, type: 'dm' }).returning();
    await db.insert(chatRoomMembers).values([
      { roomId: room.id, userId },
      { roomId: room.id, userId: targetUserId },
    ]);
  });

  socket.on('chat:create-group', async (data) => {
    const { name, memberIds } = data;
    const allMembers = [...new Set([userId, ...memberIds])];
    const [room] = await db.insert(chatRooms).values({ name, type: 'group' }).returning();
    await Promise.all(
      allMembers.map((uid) => db.insert(chatRoomMembers).values({ roomId: room.id, userId: uid }))
    );
  });
}
