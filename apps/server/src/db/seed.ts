import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { users } from './schema/index.js';

export async function seedAdmin() {
  const [existing] = await db.select().from(users).where(eq(users.email, 'admin@admin.com'));
  if (existing) return;

  const hashed = await bcrypt.hash('admin', 10);
  await db.insert(users).values({
    email: 'admin@admin.com',
    password: hashed,
    nickname: '관리자',
    role: 'admin',
  });
  console.log('Admin account seeded (admin@admin.com / admin)');
}
