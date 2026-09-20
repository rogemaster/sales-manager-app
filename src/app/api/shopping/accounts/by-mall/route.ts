import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { shoppingAccounts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { ShoppingMalls } from '@/types/common.type';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { mallCode } = (await req.json()) as { mallCode: ShoppingMalls };

    // 목록(list)과 조건이 다르다 — 여기는 "지금 보낼 수 있는 계정"이라 활성 계정만 돌려준다.
    const accounts = await db
      .select({
        id: shoppingAccounts.id,
        mallCode: shoppingAccounts.mallCode,
        mallId: shoppingAccounts.mallId,
      })
      .from(shoppingAccounts)
      .where(
        and(
          eq(shoppingAccounts.ownerId, session.ownerId),
          eq(shoppingAccounts.mallCode, mallCode),
          eq(shoppingAccounts.isActive, true),
        ),
      );

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('몰별 쇼핑몰 계정 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
