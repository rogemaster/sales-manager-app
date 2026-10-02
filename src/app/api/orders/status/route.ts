import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { BulkOrderStatusResult } from '@/features/order/types/order.types';
import { loadOrderActor } from '@/features/order/server/orderStore';
import { applyBulkStatusChange, runMallSyncedChange } from '@/features/order/server/orderStatusBulk';
import { planBulkStatusChange, planConfirmOrders, toBulkStatusResult } from '@/features/order/util/orderBulkStatus';
import { orderStatusBulkRequestSchema } from '@/features/order/util/orderRequestSchema';
import { allowedFromStatuses } from '@/features/order/util/orderStatusRule';

// 발주확인은 계정마다 몰을 차례로 부른다(호출당 10초 타임아웃) — 수집 route와 같은 상한.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, orderStatusBulkRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids, orderStatus } = body;
    if (ids.length === 0) return NextResponse.json({ successCount: 0, failures: [] } satisfies BulkOrderStatusResult);

    const rows = await db
      .select({
        orderNumber: orders.orderNumber,
        orderStatus: orders.orderStatus,
        deliveryCompany: orders.deliveryCompany,
        invoiceNumber: orders.invoiceNumber,
        shoppingAccountId: orders.shoppingAccountId,
        shopOrderNumber: orders.shopOrderNumber,
      })
      .from(orders)
      .where(and(eq(orders.ownerId, session.ownerId), inArray(orders.orderNumber, ids)));

    // 발주확인은 버튼·Select 어느 길로 와도 몰을 부른다(스펙 결정 4). 그 밖의 상태는 우리 상태만 바꾼다.
    if (orderStatus === 'CONFIRMED_ORDER') {
      const result = await runMallSyncedChange({
        plan: planConfirmOrders(ids, rows),
        action: 'CONFIRM',
        next: 'CONFIRMED_ORDER',
        fromStatuses: allowedFromStatuses('CONFIRMED_ORDER'),
        actor: await loadOrderActor(session),
        now: new Date(),
      });
      return NextResponse.json(result satisfies BulkOrderStatusResult);
    }

    const plan = planBulkStatusChange(ids, rows, orderStatus);
    const updated =
      plan.targets.length > 0
        ? await applyBulkStatusChange({
            targets: plan.targets,
            next: orderStatus,
            actor: await loadOrderActor(session),
            now: new Date(),
          })
        : [];

    return NextResponse.json(toBulkStatusResult(plan, updated) satisfies BulkOrderStatusResult);
  } catch (error) {
    console.error('주문 상태 일괄변경 중 에러:', error);
    return serverErrorResponse();
  }
}
