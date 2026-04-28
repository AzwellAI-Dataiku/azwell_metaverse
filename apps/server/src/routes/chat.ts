import { Router } from 'express';
import { eq, and, desc, inArray, notInArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chatRooms, chatRoomMembers, messages, users, deletedMessages } from '../db/schema/index.js';
import { authMiddleware } from './middleware.js';
import { getIO } from '../socket/index.js';

const router = Router();
router.use(authMiddleware);

// Public chat history by floor
router.get('/public/:floor', async (req, res) => {
  const floor = parseInt(req.params.floor);
  if (isNaN(floor)) return res.status(400).json({ error: 'Invalid floor' });

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const msgs = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      senderNickname: users.nickname,
      content: messages.content,
      floor: messages.floor,
      roomId: messages.roomId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.floor, floor))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(msgs.reverse().map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.get('/rooms', async (req, res) => {
  try {
    const memberships = await db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, req.userId!));

    if (memberships.length === 0) return res.json([]);

    const roomIds = memberships.map((m) => m.roomId);
    const rooms = await db.select().from(chatRooms).where(
      eq(chatRooms.id, roomIds[0]) // Simple for now
    );

    const result = await Promise.all(
      roomIds.map(async (roomId) => {
        const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
        const members = await db
          .select({ userId: chatRoomMembers.userId })
          .from(chatRoomMembers)
          .where(eq(chatRoomMembers.roomId, roomId));
        return { ...room, members: members.map((m) => m.userId) };
      })
    );

    res.json(result);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const myId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // 내가 삭제한 메시지 ID 목록
    const deleted = await db
      .select({ messageId: deletedMessages.messageId })
      .from(deletedMessages)
      .where(eq(deletedMessages.userId, myId));
    const deletedIds = deleted.map((d) => d.messageId);

    const whereClause = deletedIds.length > 0
      ? and(eq(messages.roomId, roomId), notInArray(messages.id, deletedIds))
      : eq(messages.roomId, roomId);

    const msgs = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        senderNickname: users.nickname,
        roomId: messages.roomId,
        content: messages.content,
        floor: messages.floor,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(whereClause!)
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    res.json(msgs.reverse().map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 채팅방 나가기 (DM/그룹)
router.delete('/rooms/:roomId', async (req, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const myId = req.userId!;

    // 채팅방 존재 확인
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, roomId));
    if (!room) return res.status(404).json({ error: '채팅방을 찾을 수 없습니다' });

    // 멤버십 삭제
    await db
      .delete(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, myId)));

    // 남은 멤버가 없으면 채팅방 자체 삭제
    const remaining = await db
      .select()
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.roomId, roomId));
    if (remaining.length === 0) {
      await db.delete(messages).where(eq(messages.roomId, roomId));
      await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/rooms/group', async (req, res) => {
  try {
    const { name, memberIds } = req.body as { name: string; memberIds: number[] };
    const allMembers = [...new Set([req.userId!, ...memberIds])];

    const [room] = await db.insert(chatRooms).values({ name, type: 'group' }).returning();

    await Promise.all(
      allMembers.map((userId) =>
        db.insert(chatRoomMembers).values({ roomId: room.id, userId })
      )
    );

    res.status(201).json({ ...room, members: allMembers });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 온라인 유저 목록
router.get('/online-users', async (req, res) => {
  try {
    const io = getIO();
    if (!io) return res.json([]);

    const sockets = await io.fetchSockets();
    const onlineUserIds = [...new Set(sockets.map((s) => s.data.userId as number))];
    if (onlineUserIds.length === 0) return res.json([]);

    const onlineUsers = await db
      .select({ id: users.id, nickname: users.nickname })
      .from(users)
      .where(inArray(users.id, onlineUserIds));

    // 자기 자신은 제외
    res.json(onlineUsers.filter((u) => u.id !== req.userId));
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// DM 생성 (기존 DM이 있으면 반환)
router.post('/rooms/dm', async (req, res) => {
  try {
    const { targetUserId } = req.body as { targetUserId: number };
    const myId = req.userId!;

    // 기존 DM 검색
    const myRooms = await db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.userId, myId));

    for (const { roomId } of myRooms) {
      const [room] = await db.select().from(chatRooms).where(and(eq(chatRooms.id, roomId), eq(chatRooms.type, 'dm')));
      if (!room) continue;
      const members = await db
        .select({ userId: chatRoomMembers.userId })
        .from(chatRoomMembers)
        .where(eq(chatRoomMembers.roomId, roomId));
      if (members.some((m) => m.userId === targetUserId)) {
        return res.json({ ...room, members: members.map((m) => m.userId) });
      }
    }

    // 새 DM 생성
    const [targetUser] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, targetUserId));
    const [myUser] = await db.select({ nickname: users.nickname }).from(users).where(eq(users.id, myId));
    const roomName = `${myUser?.nickname || ''} & ${targetUser?.nickname || ''}`;

    const [room] = await db.insert(chatRooms).values({ name: roomName, type: 'dm' }).returning();
    await db.insert(chatRoomMembers).values([
      { roomId: room.id, userId: myId },
      { roomId: room.id, userId: targetUserId },
    ]);

    res.status(201).json({ ...room, members: [myId, targetUserId] });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
