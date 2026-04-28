import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters } from '../../db/schema/index.js';
import { incrementProgress } from '../../services/questService.js';

export function registerInteractionHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('player:sit', async (data) => {
    const { x, y } = data;
    await db.update(characters).set({ isSitting: true, positionX: x, positionY: y }).where(eq(characters.userId, userId));

    const floor = socket.data.floor as number;
    socket.to(`floor:${floor}`).emit('player:sat', { userId, x, y });

    socket.data.satAt = Date.now();
    await incrementProgress(userId, 'sit_at_desk', io, socket.id);
  });

  socket.on('player:emote', async (data) => {
    const { emoji } = data;
    const floor = socket.data.floor as number;
    io.to(`floor:${floor}`).emit('player:emote', { userId, emoji });
    await incrementProgress(userId, 'emoji_reaction', io, socket.id);
  });

  socket.on('player:stand', async () => {
    const [char] = await db.select().from(characters).where(eq(characters.userId, userId));
    if (!char) return;

    await db.update(characters).set({ isSitting: false }).where(eq(characters.userId, userId));

    const floor = socket.data.floor as number;
    socket.to(`floor:${floor}`).emit('player:stood', { userId, x: char.positionX, y: char.positionY });
  });
}
