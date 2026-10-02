import { NextRequest, NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireSession } from '@/shared/utils/apiAuth';
import { parseRequestBody } from '@/shared/utils/requestBody';
import { serverErrorResponse } from '@/shared/utils/serverError';
import { bulkIdsRequestSchema } from '@/shared/utils/bulkRequest';
import { BulkOrderStatusResult } from '@/features/order/types/order.types';
import { loadOrderActor } from '@/features/order/server/orderStore';
import { runMallSyncedChange } from '@/features/order/server/orderStatusBulk';
import { planInvoiceSend } from '@/features/order/util/orderBulkStatus';

// 계정마다 몰을 차례로 부른다(호출당 10초 타임아웃) — 수집 route와 같은 상한.
export const maxDuration = 60;

/** 송장등록 주문을 몰로 보내 성공하면 송장전송완료 + 송장전송완료일. 일상 업무라 전 등급(PERMISSIONS 표 없음). */
export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (session instanceof NextResponse) return session;

  const body = await parseRequestBody(req, bulkIdsRequestSchema);
  if (body instanceof NextResponse) return body;

  try {
    const { ids } = body;
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

    const result = await runMallSyncedChange({
      plan: planInvoiceSend(ids, rows),
      action: 'INVOICE',
      next: 'INVOICE_COMPLETE',
      fromStatuses: ['INVOICE_REGISTER'],
      actor: await loadOrderActor(session),
      now: new Date(),
    });
    return NextResponse.json(result satisfies BulkOrderStatusResult);
  } catch (error) {
    console.error('송장전송 중 에러:', error);
    return serverErrorResponse();
  }
}
