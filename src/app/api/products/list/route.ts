import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { productListRequestSchema } from '@/features/products/util/productListRequestSchema';

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, productListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { dateType, startDate, endDate, saleType, categoryId, searchType, searchValue, page, pageSize } = body;

    const conditions = [eq(products.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'update' ? products.updateDate : products.createDate;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (saleType && saleType !== 'ALL') conditions.push(eq(products.state, saleType));
    if (categoryId && categoryId !== 'ALL') conditions.push(eq(products.categoryId, categoryId));
    if (searchValue) {
      const col = searchType === 'productName' ? products.name : products.productId;
      conditions.push(ilike(col, `%${searchValue}%`));
    }

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(where);

    // ORDER BY 없이 LIMIT/OFFSET만 쓰면 Postgres가 행 순서를 보장하지 않아 페이지 간 중복·누락이 생긴다.
    // productId를 2차 정렬키로 두는 이유는 대량등록·시드 스크립트가 한 배치 전체에 동일한 createDate를
    // 기록해 동률이 흔하기 때문이다 — createDate만으로는 동률 그룹 내 순서가 여전히 불안정하다.
    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createDate), desc(products.productId))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({ products: rows, total, page, pageSize, totalPages });
  } catch (error) {
    console.error('상품 목록 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
