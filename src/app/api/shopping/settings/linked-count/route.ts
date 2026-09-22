import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { mallLinkedProducts } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';

/**
 * 삭제 대상 설정들에서 파생된 연동 건수. 삭제 확인 창의 경고에만 쓴다 — 연동 데이터는 설정과 독립이라 지우지 않는다.
 * 경로는 설정 도메인이지만 세는 대상은 연동상품이다.
 */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    const { ids } = (await req.json()) as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ totalCount: 0 });

    // 설정 소유권은 따로 확인하지 않는다 — owner_id로 거르므로 남의 설정 id를 섞어도 0만 늘어난다.
    const [{ totalCount }] = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(mallLinkedProducts)
      .where(
        and(eq(mallLinkedProducts.ownerId, session.ownerId), inArray(mallLinkedProducts.sourceShoppingSettingId, ids)),
      );

    return NextResponse.json({ totalCount });
  } catch (error) {
    console.error('연동 상품 건수 조회 중 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
