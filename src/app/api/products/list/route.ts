import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { db } from '@/db';
import { products } from '@/db/schema';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import { requireSession } from '@/shared/utils/apiAuth';
import { isYmd, toKstDateRange } from '@/shared/utils/date';
import { clampPositiveInt } from '@/shared/utils/pagination';
import { ProductSearch } from '@/features/products/types/product.types';

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  try {
    // 클라이언트가 ownerId를 보내더라도 무시한다. 소유권은 세션만 신뢰한다.
    const body = (await req.json()) as ProductSearch & { page: number; pageSize: number };
    const { dateType, startDate, endDate, saleType, categoryId, searchType, searchValue } = body;

    const page = clampPositiveInt(body.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = clampPositiveInt(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    // 날짜는 클램프하지 않고 거절한다. 잘못된 값을 임의의 기본값으로 대체하면 사용자가 요청한 것과
    // 다른 기간의 결과를 정상 응답으로 돌려주게 된다 — 빈 목록의 원인을 추적할 수 없다.
    if (!isYmd(startDate) || !isYmd(endDate)) {
      return NextResponse.json({ error: '검색 기간이 올바르지 않습니다.' }, { status: 400 });
    }

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
