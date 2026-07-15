import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { v4 as uuidv4 } from 'uuid';
import { requireSuperAdminSession } from '@/shared/utils/apiAuth';

export async function POST(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { email, password, name, phone, grade, status, avatar, bio } = await req.json();

    if (grade === 'super_admin') {
      return NextResponse.json({ error: '허용되지 않는 등급입니다.' }, { status: 403 });
    }

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 });
    }

    const now = new Date().toISOString().split('T')[0];
    const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

    await db.insert(users).values({
      id,
      ownerId: session.ownerId,
      status: status ?? 'active',
      email,
      password: await hashPassword(password),
      name: name ?? '',
      avatar: avatar ?? null,
      phone: phone ?? '',
      bio: bio ?? '',
      company: '',
      location: '',
      grade,
      createdAt: now,
      updatedAt: now,
    });

    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...user } = result[0];
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('사용자 등록 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
