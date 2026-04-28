import type { Server, Socket } from 'socket.io';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters } from '../../db/schema/index.js';

export function registerMovementHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as number;

  socket.on('player:move', async (data) => {
    const { x, y, direction } = data;

    await db.update(characters).set({ positionX: x, positionY: y }).where(eq(characters.userId, userId));

    const floor = socket.data.floor as number;
    socket.to(`floor:${floor}`).emit('player:moved', { userId, x, y, direction });
  });
}
