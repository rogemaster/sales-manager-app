import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { shoppingAccounts, shoppingSettings } from '@/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';

/**
 * 신규 설정을 만들 때 고를 수 있는 계정 목록. 계정마다 딸린 설정 건수를 함께 준다.
 *
 * 설정이 하나도 없는 계정도 0으로 나와야 하므로 계정 기준 LEFT JOIN이다.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const accounts = await db
      .select({
        id: shoppingAccounts.id,
        mallCode: shoppingAccounts.mallCode,
        mallId: shoppingAccounts.mallId,
        settingCount: sql<number>`count(${shoppingSettings.id})::int`,
      })
      .from(shoppingAccounts)
      .leftJoin(shoppingSettings, eq(shoppingSettings.mallAccountId, shoppingAccounts.id))
      .where(and(eq(shoppingAccounts.ownerId, session.ownerId), eq(shoppingAccounts.isActive, true)))
      .groupBy(shoppingAccounts.id, shoppingAccounts.mallCode, shoppingAccounts.mallId)
      .orderBy(asc(shoppingAccounts.mallCode), asc(shoppingAccounts.mallId));

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('사용 가능 쇼핑몰 계정 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
