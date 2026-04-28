import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
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

    const sockets = await io.fetchSockets();
    for (const s of sockets) {
      if (members.some((m) => m.userId === s.data.userId)) {
        s.emit('chat:private', chatMsg);
      }
    }

    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    if (room?.type === 'group') {
      await incrementProgress(userId, 'group_chat', io, socket.id);
    }

    // Busy auto-reply: notify sender if any recipient is currently in busy mode.
    // DMs/group messages are still delivered and stored — recipients see everything
    // when they come back. This only signals the sender that the other party may
    // not respond immediately.
    const busyRecipients: string[] = [];
    for (const m of members) {
      if (m.userId === userId) continue;
      const presence = getPresence(m.userId);
      if (presence?.mode === 'busy') {
        const [u] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, m.userId));
        const suffix = presence.message ? `: "${presence.message}"` : '';
        busyRecipients.push(`${u?.nickname ?? `#${m.userId}`}${suffix}`);
      }
    }
    if (busyRecipients.length > 0) {
      socket.emit('chat:system', {
        roomId,
        content: `수신자가 방해 금지 모드입니다 — ${busyRecipients.join(', ')}`,
      });
    }
  });

  socket.on('chat:typing', (data) => {
    const { isPublic, roomId } = data;
    if (isPublic) {
      const floor = socket.data.floor as number;
      socket.to(`floor:${floor}`).emit('chat:typing', { userId, isTyping: true });
    }
  });

  socket.on('chat:stop-typing', () => {
    const floor = socket.data.floor as number;
    if (floor) {
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
