import { NextRequest, NextResponse } from 'next/server';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { mallLinkedProducts } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import {
  MallLinkedProductSearchType,
  MallLinkStatus,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { LINKED_PRODUCT_COLUMNS } from '@/features/mallLinkedProduct/server/linkedProductStore';
import { toMallLinkedProduct } from '@/features/mallLinkedProduct/util/linkedProductRecord';
import { mallLinkedProductListRequestSchema } from '@/features/mallLinkedProduct/util/mallLinkedProductRequestSchema';

// 검색 타입별 대상 컬럼. 전부 컬럼이다 — 상품명은 product_snapshot에서 뽑은 생성 컬럼이다.
const SEARCH_COLUMN: Record<MallLinkedProductSearchType, AnyPgColumn> = {
  productName: mallLinkedProducts.productName,
  productCode: mallLinkedProducts.sourceProductId,
  externalProductCode: mallLinkedProducts.externalProductId,
  createdBy: mallLinkedProducts.createdByEmail,
  updatedBy: mallLinkedProducts.updatedByEmail,
};

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, mallLinkedProductListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { page, pageSize } = body;
    const { dateType, startDate, endDate, mallCode, mallAccountId, shoppingSettingId, saleState, searchValue } =
      body.filters;
    // 스키마가 옵션 상수(MALL_LINK_STATUS_OPTIONS·MALL_LINKED_SEARCH_TYPE) 안의 값만 통과시킨다.
    const linkStatus = body.filters.linkStatus as MallLinkStatus | 'ALL';
    const searchType = body.filters.searchType as MallLinkedProductSearchType;

    const conditions = [eq(mallLinkedProducts.ownerId, session.ownerId)];

    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = dateType === 'updatedAt' ? mallLinkedProducts.updatedAt : mallLinkedProducts.lastSentAt;
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (mallCode !== 'ALL') conditions.push(eq(mallLinkedProducts.mallCode, mallCode));
    // 계정 필터가 스냅샷을 파던 비대칭이 사라졌다 — 계정은 이제 top-level 컬럼이다.
    if (mallAccountId !== 'ALL') conditions.push(eq(mallLinkedProducts.mallAccountId, mallAccountId));
    if (shoppingSettingId !== 'ALL') {
      conditions.push(eq(mallLinkedProducts.sourceShoppingSettingId, shoppingSettingId));
    }
    if (linkStatus !== 'ALL') conditions.push(eq(mallLinkedProducts.status, linkStatus));
    if (saleState !== 'ALL') conditions.push(eq(mallLinkedProducts.productState, saleState));

    const column = SEARCH_COLUMN[searchType];
    if (searchValue && column) conditions.push(ilike(column, `%${searchValue}%`));

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(mallLinkedProducts)
      .where(where);

    // 같은 배치는 같은 시각을 공유하므로 id를 2차 정렬키로 둔다(없으면 페이지 간 중복·누락).
    const rows = await db
      .select(LINKED_PRODUCT_COLUMNS)
      .from(mallLinkedProducts)
      .where(where)
      .orderBy(desc(mallLinkedProducts.lastSentAt), desc(mallLinkedProducts.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return NextResponse.json({ linkedProducts: rows.map(toMallLinkedProduct), total, page, pageSize, totalPages });
  } catch (error) {
    console.error('쇼핑몰 연동 상품 목록 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
