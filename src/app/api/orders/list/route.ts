import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { toKstDateRange } from '@/shared/utils/date';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { ShoppingMalls } from '@/types/common.type';
import { OrderDateType, OrderSearchKey, OrderStatusTypes } from '@/features/order/types/order.types';
import { toOrder } from '@/features/order/util/orderRecord';
import { escapeLikePattern, orderListRequestSchema } from '@/features/order/util/orderRequestSchema';

const DATE_COLUMN: Record<OrderDateType, AnyPgColumn> = {
  orderCollectionDate: orders.collectedAt,
  paymentDate: orders.paymentDate,
  invoiceRegisteredAt: orders.invoiceRegisteredAt,
  invoiceSentAt: orders.invoiceSentAt,
};

const SEARCH_COLUMN: Record<OrderSearchKey, AnyPgColumn> = {
  orderName: orders.orderName,
  payeeName: orders.payeeName,
  orderProductName: orders.orderProductName,
  orderNumber: orders.orderNumber,
  shopOrderNumber: orders.shopOrderNumber,
};

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  // 클라이언트가 ownerId를 보내더라도 스키마가 버린다. 소유권은 세션만 신뢰한다.
  const body = await parseRequestBody(req, orderListRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { page, pageSize } = body;
    const { dateType, startDate, endDate, mallCode, mallId, deliveryCompany, orderStatus, searchType, searchValue } =
      body.filters;

    const conditions = [eq(orders.ownerId, session.ownerId)];

    // 송장 날짜가 null인 주문은 그 기준 검색에 나오지 않는다 — 아직 송장을 등록·전송하지 않은 주문이다.
    const { start, endExclusive } = toKstDateRange(startDate, endDate);
    const dateCol = DATE_COLUMN[dateType];
    conditions.push(gte(dateCol, start), lt(dateCol, endExclusive));

    if (mallCode !== 'ALL') conditions.push(eq(orders.mallCode, mallCode as ShoppingMalls));
    if (mallId !== 'ALL') conditions.push(eq(orders.mallId, mallId));
    // 옛 MSW는 이 조건을 무시했다 — 택배사를 골라도 걸러지지 않았다.
    if (deliveryCompany !== 'ALL') conditions.push(eq(orders.deliveryCompany, deliveryCompany));
    if (orderStatus !== 'ALL') conditions.push(eq(orders.orderStatus, orderStatus as OrderStatusTypes));
    if (searchValue) conditions.push(ilike(SEARCH_COLUMN[searchType], `%${escapeLikePattern(searchValue)}%`));

    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(orders)
      .where(where);

    // 같은 시각에 수집된 주문이 있어 주문번호를 2차 정렬키로 둔다(없으면 페이지 간 중복·누락).
    const rows = await db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.collectedAt), desc(orders.orderNumber))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return NextResponse.json({ orders: rows.map(toOrder), total, page, pageSize, totalPages });
  } catch (error) {
    console.error('주문 목록 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
