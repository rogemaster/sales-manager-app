import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { v4 as uuidv4 } from 'uuid';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { registerBaseSchema } from '@/features/auth/util/registerValidation';

export async function POST(req: NextRequest) {
  const body = await parseRequestBody(req, registerBaseSchema);
  if (body instanceof NextResponse) return body;

  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 });
    }

    const now = new Date().toISOString().split('T')[0];
    const id = `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
    await db.insert(users).values({
      id,
      ownerId: id,
      status: 'active',
      email: body.email,
      password: await hashPassword(body.password),
      name: body.contactName,
      avatar: null,
      phone: body.contactPhone,
      bio: '',
      company: body.companyName,
      location: '',
      grade: 'super_admin',
      representativeName: body.representativeName,
      businessNumber: body.businessNumber,
      businessCategory: body.businessCategory,
      businessLicenseName: body.businessLicenseName,
      contactEmail: body.contactEmail,
      settlementName: body.settlementName,
      settlementEmail: body.settlementEmail,
      settlementPhone: body.settlementPhone,
      createdAt: now,
      updatedAt: now,
    });

    return new NextResponse(null, { status: 201 });
  } catch (error) {
    console.error('회원가입 처리 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
