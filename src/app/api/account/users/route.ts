import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { requireSuperAdminSession } from '@/shared/utils/apiAuth';

export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdminSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = await req.json();
    const uniqueIds = [...new Set(ids)] as string[];
    const owned = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, uniqueIds), eq(users.ownerId, session.ownerId)));

    if (owned.length !== uniqueIds.length) {
      return NextResponse.json({ error: '삭제 권한이 없는 사용자가 포함되어 있습니다.' }, { status: 403 });
    }

    await db.delete(users).where(inArray(users.id, ids));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
