import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isYmd, toKstDateRange } from '@/shared/utils/date';
import { toHomeStats } from '@/features/home/util/homeStats';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    const { startDate, endDate } = (await req.json()) as { startDate: unknown; endDate: unknown };
    if (!isYmd(startDate) || !isYmd(endDate)) {
      return NextResponse.json({ error: '조회 기간이 올바르지 않습니다.' }, { status: 400 });
    }

    // 기간은 등록일 기준이다 — "그 기간에 등록한 상품의 현재 상태별 건수".
    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const rows = await db
      .select({ state: products.state, count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(eq(products.ownerId, session.ownerId), gte(products.createDate, start), lt(products.createDate, endExclusive)),
      )
      .groupBy(products.state);

    return NextResponse.json(toHomeStats(rows));
  } catch (error) {
    console.error('홈 상품 통계 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
