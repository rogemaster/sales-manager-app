import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { homeStatsRequestSchema } from '@/features/home/util/homeStatsRequestSchema';
import { toHomeOrderStats } from '@/features/home/util/homeStats';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, homeStatsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    // 기간은 수집일 기준이다 — "그 기간에 수집한 주문의 현재 상태별 건수"(옛 MSW 집계와 같다).
    const { start, endExclusive } = toKstDateRange(body.startDate, body.endDate);
    const rows = await db
      .select({ status: orders.orderStatus, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        and(eq(orders.ownerId, session.ownerId), gte(orders.collectedAt, start), lt(orders.collectedAt, endExclusive)),
      )
      .groupBy(orders.orderStatus);

    return NextResponse.json(toHomeOrderStats(rows));
  } catch (error) {
    console.error('홈 주문 통계 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
