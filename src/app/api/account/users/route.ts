import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();
    await db.delete(users).where(inArray(users.id, ids));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('사용자 삭제 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
