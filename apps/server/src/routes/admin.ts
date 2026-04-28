import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { eq, count, and, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, chatRooms, chatRoomMembers, messages, questDefinitions, questProgress } from '../db/schema/index.js';
import { authMiddleware } from './middleware.js';
import { adminMiddleware } from './adminMiddleware.js';
import { getIO } from '../socket/index.js';

const router = Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// 관리자 여부 확인
router.get('/me', (_req, res) => {
  res.json({ isAdmin: true });
});

// 대시보드 통계
router.get('/stats', async (_req, res) => {
  try {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [messageCount] = await db.select({ count: count() }).from(messages);
    const [roomCount] = await db.select({ count: count() }).from(chatRooms);
    const [questCount] = await db.select({ count: count() }).from(questDefinitions);

    const io = getIO();
    let onlineCount = 0;
    if (io) {
      const sockets = await io.fetchSockets();
      onlineCount = new Set(sockets.map((s) => s.data.userId)).size;
    }

    res.json({
      users: userCount.count,
      online: onlineCount,
      messages: messageCount.count,
      rooms: roomCount.count,
      quests: questCount.count,
    });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 사용자 목록
router.get('/users', async (_req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        level: users.level,
        xp: users.xp,
        gold: users.gold,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.id);

    res.json(allUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 사용자 정보 수정
router.put('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nickname, level, xp, gold } = req.body;

    const [updated] = await db
      .update(users)
      .set({
        ...(nickname !== undefined && { nickname }),
        ...(level !== undefined && { level }),
        ...(xp !== undefined && { xp }),
        ...(gold !== undefined && { gold }),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        nickname: users.nickname,
        level: users.level,
        xp: users.xp,
        gold: users.gold,
        role: users.role,
        createdAt: users.createdAt,
      });

    if (!updated) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: '이미 사용 중인 닉네임입니다' });
    res.status(500).json({ error: '서버 오류' });
  }
});

// 관리자 권한 부여/해제
router.put('/users/:id/role', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role } = req.body as { role: 'user' | 'admin' };

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: '유효하지 않은 역할입니다' });
    }

    // 자기 자신의 관리자 권한은 해제 불가
    if (id === req.userId && role === 'user') {
      return res.status(400).json({ error: '본인의 관리자 권한은 해제할 수 없습니다' });
    }

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({ id: users.id, role: users.role });

    if (!updated) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 사용자 삭제
router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.userId) return res.status(400).json({ error: '본인 계정은 삭제할 수 없습니다' });

    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 본인 비밀번호 변경
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 6자 이상이어야 합니다' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, req.userId!));
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, req.userId!));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 채팅방 목록
router.get('/rooms', async (_req, res) => {
  try {
    const allRooms = await db.select().from(chatRooms).orderBy(desc(chatRooms.createdAt));

    const result = await Promise.all(
      allRooms.map(async (room) => {
        const members = await db
          .select({ userId: chatRoomMembers.userId })
          .from(chatRoomMembers)
          .where(eq(chatRoomMembers.roomId, room.id));
        const [msgCount] = await db
          .select({ count: count() })
          .from(messages)
          .where(eq(messages.roomId, room.id));
        return {
          ...room,
          createdAt: room.createdAt.toISOString(),
          memberCount: members.length,
          messageCount: msgCount.count,
        };
      })
    );

    res.json(result);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 채팅방 삭제
router.delete('/rooms/:id', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    await db.delete(messages).where(eq(messages.roomId, roomId));
    await db.delete(chatRoomMembers).where(eq(chatRoomMembers.roomId, roomId));
    await db.delete(chatRooms).where(eq(chatRooms.id, roomId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 채팅방 메시지 조회
router.get('/rooms/:id/messages', async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 100;

    const msgs = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        senderNickname: users.nickname,
        roomId: messages.roomId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    res.json(msgs.reverse().map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 메시지 삭제
router.delete('/messages/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(messages).where(eq(messages.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 퀘스트 목록
router.get('/quests', async (_req, res) => {
  try {
    const quests = await db.select().from(questDefinitions).orderBy(questDefinitions.id);
    res.json(quests);
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

// 퀘스트 생성
router.post('/quests', async (req, res) => {
  try {
    const { key, title, description, target, xpReward } = req.body;
    const [quest] = await db
      .insert(questDefinitions)
      .values({ key, title, description, target, xpReward })
      .returning();
    res.status(201).json(quest);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: '이미 존재하는 퀘스트 키입니다' });
    res.status(500).json({ error: '서버 오류' });
  }
});

// 퀘스트 수정
router.put('/quests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { key, title, description, target, xpReward } = req.body;
    const [updated] = await db
      .update(questDefinitions)
      .set({ key, title, description, target, xpReward })
      .where(eq(questDefinitions.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: '퀘스트를 찾을 수 없습니다' });
    res.json(updated);
  } catch (err: any) {
    if (err?.code === '23505') return res.status(409).json({ error: '이미 존재하는 퀘스트 키입니다' });
    res.status(500).json({ error: '서버 오류' });
  }
});

// 퀘스트 삭제
router.delete('/quests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(questProgress).where(eq(questProgress.questId, id));
    await db.delete(questDefinitions).where(eq(questDefinitions.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
});

export default router;
