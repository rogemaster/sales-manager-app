import { NextRequest, NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { orderComments } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { findOwnedOrder, loadOrderActor, orderNotFoundResponse } from '@/features/order/server/orderStore';
import { toOrderComment } from '@/features/order/util/orderRecord';
import { orderCommentRequestSchema } from '@/features/order/util/orderRequestSchema';

type Context = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  try {
    if (!(await findOwnedOrder(orderId, session.ownerId))) return orderNotFoundResponse();
    const rows = await db
      .select()
      .from(orderComments)
      .where(and(eq(orderComments.orderNumber, orderId), eq(orderComments.ownerId, session.ownerId)))
      .orderBy(asc(orderComments.createdAt), asc(orderComments.id));
    return NextResponse.json(rows.map(toOrderComment));
  } catch (error) {
    console.error('주문 코멘트 조회 중 에러:', error);
    return serverErrorResponse();
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  const body = await parseRequestBody(req, orderCommentRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    if (!(await findOwnedOrder(orderId, session.ownerId))) return orderNotFoundResponse();
    const actor = await loadOrderActor(session);
    const [row] = await db
      .insert(orderComments)
      .values({
        orderNumber: orderId,
        ownerId: session.ownerId,
        content: body.content,
        authorName: actor.name,
        authorEmail: actor.email,
        createdAt: new Date(),
      })
      .returning();
    return NextResponse.json(toOrderComment(row));
  } catch (error) {
    console.error('주문 코멘트 저장 중 에러:', error);
    return serverErrorResponse();
  }
}
