import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { EMAIL_TAKEN_MESSAGE, isEmailTaken } from '@/features/account/server/userStore';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { generatorUserId } from '@/utils/codeGenerator';
import { requirePermission } from '@/shared/utils/apiAuth';
import { toKstYmd } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { resolveNewUserStatus } from '@/features/account/util/userStatus';
import { toPublicUser } from '@/features/account/util/publicUser';
import { createUserSchema } from '@/features/account/util/userCreateSchema';

export async function POST(req: NextRequest) {
  const session = await requirePermission(req, 'user.create');
  if (session instanceof NextResponse) return session;

  // 스키마에 status가 없다 — 등록자 등급으로 서버가 정한다. super_admin 등급도 스키마가 거부한다.
  const body = await parseRequestBody(req, createUserSchema);
  if (body instanceof NextResponse) return body;

  try {
    if (await isEmailTaken(body.email)) {
      return NextResponse.json({ error: EMAIL_TAKEN_MESSAGE }, { status: 400 });
    }

    const now = toKstYmd(new Date());
    const id = generatorUserId();

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
    return NextResponse.json(toPublicUser(result[0]), { status: 201 });
  } catch (error) {
    console.error('사용자 등록 중 에러:', error);
    return serverErrorResponse();
  }
}
