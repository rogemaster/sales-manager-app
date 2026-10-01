import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '@/db';
import { orderClaims, orderEditHistories, orders } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import {
  findOrderClaim,
  findOwnedOrder,
  loadOrderActor,
  orderNotFoundResponse,
} from '@/features/order/server/orderStore';
import { toOrder } from '@/features/order/util/orderRecord';
import { findOrderStatusChangeViolation } from '@/features/order/util/orderStatusRule';
import {
  buildOrderUpdate,
  diffOrderFields,
  orderWriteSchema,
  resolveRequestedStatus,
} from '@/features/order/util/orderWrite';

type Context = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  try {
    const row = await findOwnedOrder(orderId, session.ownerId);
    if (!row) return orderNotFoundResponse();
    return NextResponse.json(toOrder(row));
  } catch (error) {
    console.error('주문 조회 중 에러:', error);
    return serverErrorResponse();
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  // ① 몰 원본은 스키마가 버린다. 남은 값으로 SET을 만드는 것은 buildOrderUpdate다.
  const parsed = await parseRequestBody(req, orderWriteSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const current = await findOwnedOrder(orderId, session.ownerId);
    if (!current) return orderNotFoundResponse();

    // 사용자가 상태를 안 건드린 저장은 폼을 연 사이 바뀐 현재 상태를 되돌리지 않는다.
    const values = {
      ...parsed,
      orderStatus: resolveRequestedStatus(current.orderStatus, parsed.baseStatus, parsed.orderStatus),
    };

    const violation = findOrderStatusChangeViolation(current.orderStatus, values.orderStatus);
    if (violation) return NextResponse.json({ error: violation }, { status: 400 });

    const claim = await findOrderClaim(orderId, session.ownerId);
    const now = new Date();
    const update = buildOrderUpdate(values, current, now);
    // 클레임이 없는 주문의 메모는 저장할 곳이 없다 — 세지도 쓰지도 않는다.
    const nextNote = values.claim?.handlerNote;
    const changedFields = diffOrderFields(
      current,
      update,
      claim ? { current: claim.handlerNote, next: nextNote } : undefined,
    );
    if (changedFields.length === 0) return NextResponse.json(toOrder(current));

    const actor = await loadOrderActor(session);
    const owned = and(eq(orders.orderNumber, orderId), eq(orders.ownerId, session.ownerId));
    const queries: BatchItem<'pg'>[] = [db.update(orders).set(update).where(owned)];
    if (claim && nextNote !== undefined && changedFields.includes('claim.handlerNote')) {
      queries.push(db.update(orderClaims).set({ handlerNote: nextNote }).where(eq(orderClaims.id, claim.id)));
    }
    queries.push(
      db.insert(orderEditHistories).values({
        orderNumber: orderId,
        ownerId: session.ownerId,
        changedFields,
        modifiedByName: actor.name,
        modifiedByEmail: actor.email,
        modifiedAt: now,
      }),
    );
    // neon-http에 db.transaction()은 없지만 batch는 한 트랜잭션으로 실행된다 — "주문은 바뀌었는데 이력이 없음"이 생기지 않는다.
    await db.batch(queries as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]);

    const saved = await findOwnedOrder(orderId, session.ownerId);
    return saved ? NextResponse.json(toOrder(saved)) : orderNotFoundResponse();
  } catch (error) {
    console.error('주문 저장 중 에러:', error);
    return serverErrorResponse();
  }
}
