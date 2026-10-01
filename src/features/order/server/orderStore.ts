import 'server-only';
import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { orderClaims, orders, users } from '@/db/schema';
import { ApiSession } from '@/shared/utils/apiAuth';
import { OrderClaimRow, OrderRow } from '../util/orderRecord';
import { ORDER_NOT_FOUND_MESSAGE } from '../util/orderBulkStatus';

/** 남의 주문과 없는 주문을 같은 404로 답한다 — 구분하면 남의 주문번호를 탐색하는 도구가 된다. */
export const orderNotFoundResponse = () => NextResponse.json({ error: ORDER_NOT_FOUND_MESSAGE }, { status: 404 });

export const findOwnedOrder = async (orderNumber: string, ownerId: string): Promise<OrderRow | null> => {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, orderNumber), eq(orders.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
};

export const findOrderClaim = async (orderNumber: string, ownerId: string): Promise<OrderClaimRow | null> => {
  const [row] = await db
    .select()
    .from(orderClaims)
    .where(and(eq(orderClaims.orderNumber, orderNumber), eq(orderClaims.ownerId, ownerId)))
    .limit(1);
  return row ?? null;
};

export type OrderActor = { ownerId: string; name: string; email: string };

/** 코멘트 작성자·이력 수정자. 화면은 이름을 보여주고, 이름이 바뀌어도 추적하도록 이메일도 남긴다. 이름이 비면 이메일. */
export const loadOrderActor = async (session: ApiSession): Promise<OrderActor> => {
  const [row] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.id)).limit(1);
  return { ownerId: session.ownerId, name: row?.name || session.email, email: session.email };
};
