import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest) {
  try {
    const { email, name, phone, company, bio } = await req.json();

    const now = new Date().toISOString().split('T')[0];

    await db
      .update(users)
      .set({
        name,
        phone,
        ...(company !== undefined && { company }),
        ...(bio !== undefined && { bio }),
        updatedAt: now,
      })
      .where(eq(users.email, email));

    const [updated] = await db
      .select({
        email: users.email,
        name: users.name,
        avatar: users.avatar,
        phone: users.phone,
        bio: users.bio,
        company: users.company,
        location: users.location,
        grade: users.grade,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!updated) return new NextResponse(null, { status: 404 });

    return NextResponse.json({ ...updated, avatar: updated.avatar ?? '' });
  } catch (error) {
    console.error('프로필 수정 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
