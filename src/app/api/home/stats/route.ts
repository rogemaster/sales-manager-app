import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { homeStatsRequestSchema } from '@/features/home/util/homeStatsRequestSchema';
import { toHomeStats } from '@/features/home/util/homeStats';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, homeStatsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { startDate, endDate } = body;

    // 기간은 등록일 기준이다 — "그 기간에 등록한 상품의 현재 상태별 건수".
    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const rows = await db
      .select({ state: products.state, count: sql<number>`count(*)::int` })
      .from(products)
      .where(
        and(
          eq(products.ownerId, session.ownerId),
          gte(products.createDate, start),
          lt(products.createDate, endExclusive),
        ),
      )
      .groupBy(products.state);

    return NextResponse.json(toHomeStats(rows));
  } catch (error) {
    console.error('홈 상품 통계 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
