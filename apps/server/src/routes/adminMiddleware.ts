import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, req.userId!));

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }
    next();
  } catch {
    res.status(500).json({ error: '서버 오류' });
  }
}
