import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { v4 as uuidv4 } from 'uuid';
import { requirePermission } from '@/shared/utils/apiAuth';
import { toKstYmd } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { resolveNewUserStatus } from '@/features/account/util/userStatus';
import { createUserSchema } from '@/features/account/util/userCreateSchema';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'user.create');
  if (session instanceof NextResponse) return session;

  // 스키마에 status가 없다 — 등록자 등급으로 서버가 정한다. super_admin 등급도 스키마가 거부한다.
  const body = await parseRequestBody(req, createUserSchema);
  if (body instanceof NextResponse) return body;

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 });
    }

    const now = toKstYmd(new Date());
    const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;

    await db.insert(users).values({
      id,
      ownerId: session.ownerId,
      status: resolveNewUserStatus(session.grade),
      email: body.email,
      password: await hashPassword(body.password),
      name: body.name,
      avatar: body.avatar || null,
      phone: body.phone,
      bio: body.bio ?? '',
      company: '',
      location: '',
      grade: body.grade,
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
