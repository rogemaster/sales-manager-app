import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { orderEditHistories } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { findOwnedOrder, orderNotFoundResponse } from '@/features/order/server/orderStore';
import { toOrderEditHistory } from '@/features/order/util/orderRecord';

type Context = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  try {
    if (!(await findOwnedOrder(orderId, session.ownerId))) return orderNotFoundResponse();
    // 오래된 것부터 — OrderEditHistorySection이 옛 mock과 같은 순서를 전제로 그린다.
    const rows = await db
      .select()
      .from(orderEditHistories)
      .where(and(eq(orderEditHistories.orderNumber, orderId), eq(orderEditHistories.ownerId, session.ownerId)))
      .orderBy(asc(orderEditHistories.modifiedAt), asc(orderEditHistories.id));
    return NextResponse.json(rows.map(toOrderEditHistory));
  } catch (error) {
    console.error('주문 수정이력 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
