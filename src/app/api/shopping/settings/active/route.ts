import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingSettings } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';

/** 활성 설정만 추린 선택용 옵션. 쇼핑몰 전송 대상 선택과 연동 목록 필터가 쓴다. */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const options = await db
      .select({
        id: shoppingSettings.id,
        mallAccountId: shoppingSettings.mallAccountId,
        mallCode: shoppingSettings.mallCode,
        mallId: shoppingSettings.mallId,
        nickname: shoppingSettings.nickname,
      })
      .from(shoppingSettings)
      .where(and(eq(shoppingSettings.ownerId, session.ownerId), eq(shoppingSettings.isActive, true)))
      .orderBy(asc(shoppingSettings.mallCode), asc(shoppingSettings.nickname));

    return NextResponse.json(options);
  } catch (error) {
    console.error('활성 쇼핑몰 정보설정 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
