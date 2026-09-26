import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { mallLinkedProducts } from '@/db/schema';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { homeStatsRequestSchema } from '@/features/home/util/homeStatsRequestSchema';
import { toLinkedProductStats } from '@/features/home/util/homeStats';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, homeStatsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { startDate, endDate } = body;

    // 기간은 최종연동일시 기준이다 — 연동상품 목록의 기본 날짜 기준과 같고, (owner_id, last_sent_at) 인덱스를 탄다.
    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const rows = await db
      .select({ status: mallLinkedProducts.status, count: sql<number>`count(*)::int` })
      .from(mallLinkedProducts)
      .where(
        and(
          eq(mallLinkedProducts.ownerId, session.ownerId),
          gte(mallLinkedProducts.lastSentAt, start),
          lt(mallLinkedProducts.lastSentAt, endExclusive),
        ),
      )
      .groupBy(mallLinkedProducts.status);

    return NextResponse.json(toLinkedProductStats(rows));
  } catch (error) {
    console.error('홈 연동상품 통계 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
