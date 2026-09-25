import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstYmd } from '@/shared/utils/date';
import { RecentProduct } from '@/features/home/types/home.types';
import { ProductStateType } from '@/features/products/types/product.types';

const RECENT_LIMIT = 5;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    // 정렬은 상품 목록 route와 같다 — 대량등록은 한 배치에 같은 createDate를 기록해 productId가 동률을 가른다.
    const rows = await db
      .select({
        productId: products.productId,
        name: products.name,
        price: products.price,
        state: products.state,
        createDate: products.createDate,
      })
      .from(products)
      .where(eq(products.ownerId, session.ownerId))
      .orderBy(desc(products.createDate), desc(products.productId))
      .limit(RECENT_LIMIT);

    const recent: RecentProduct[] = rows.map((row) => ({
      ...row,
      state: row.state as ProductStateType,
      createDate: toKstYmd(row.createDate),
    }));

    return NextResponse.json(recent);
  } catch (error) {
    console.error('최근 상품 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
