import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/shared/utils/apiAuth';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { findOrderClaim, findOwnedOrder, orderNotFoundResponse } from '@/features/order/server/orderStore';
import { toOrderClaim } from '@/features/order/util/orderRecord';

type Context = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;
  const { orderId } = await params;

  try {
    if (!(await findOwnedOrder(orderId, session.ownerId))) return orderNotFoundResponse();
    // 클레임이 없는 주문은 null이다(화면이 "클레임 없음"으로 그린다).
    const claim = await findOrderClaim(orderId, session.ownerId);
    return NextResponse.json(claim ? toOrderClaim(claim) : null);
  } catch (error) {
    console.error('클레임 조회 중 에러:', error);
    return serverErrorResponse();
  }
}
