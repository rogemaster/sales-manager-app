import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { checkEmailSchema } from '@/features/auth/util/registerValidation';

export async function POST(req: NextRequest) {
  // 가입 전 공개 route라 입력을 먼저 거른다 — 빈 값·객체가 그대로 DB 조회로 가지 않게.
  const body = await parseRequestBody(req, checkEmailSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { email } = body;
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    return NextResponse.json({ available: existing.length === 0 });
  } catch (error) {
    console.error('이메일 중복 확인 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
