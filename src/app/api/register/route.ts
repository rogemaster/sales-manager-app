import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/db/password';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      companyName,
      representativeName,
      businessNumber,
      businessCategory,
      businessLicenseName,
      contactName,
      contactEmail,
      contactPhone,
      settlementName,
      settlementEmail,
      settlementPhone,
    } = body;

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 400 });
    }

    const now = new Date().toISOString().split('T')[0];
    await db.insert(users).values({
      id: `usr_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
      ownerId: null,
      status: 'active',
      email,
      password: await hashPassword(password),
      name: contactName ?? '',
      avatar: null,
      phone: contactPhone ?? '',
      bio: '',
      company: companyName ?? '',
      location: '',
      grade: 'super_admin',
      representativeName: representativeName ?? '',
      businessNumber: businessNumber ?? '',
      businessCategory: businessCategory ?? '',
      businessLicenseName: businessLicenseName ?? '',
      contactEmail: contactEmail ?? '',
      settlementName: settlementName ?? '',
      settlementEmail: settlementEmail ?? '',
      settlementPhone: settlementPhone ?? '',
      createdAt: now,
      updatedAt: now,
    });

    return new NextResponse(null, { status: 201 });
  } catch (error) {
    console.error('회원가입 처리 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
