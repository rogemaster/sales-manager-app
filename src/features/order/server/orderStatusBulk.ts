import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { OrderStatusTypes } from '../types/order.types';
import { allowedFromStatuses } from '../util/orderStatusRule';
import { OrderActor } from './orderStore';

/**
 * 상태 변경 + 이력 INSERT를 CTE 한 문장으로 실행한다 — 한 문장이라 원자적이다.
 * 두 문장으로 나누면 이력 INSERT만 실패했을 때 "상태는 바뀌었는데 이력이 없음"이 된다.
 * batch로 묶을 수 없는 이유: 이력은 실제로 UPDATE된 주문에만 써야 하는데, 그 목록은 UPDATE가 끝나야 안다.
 * WHERE의 출발 상태 조건이 "확인한 뒤 다른 사람이 먼저 바꾼 주문"을 덮어쓰지 않게 막는다.
 * 테이블·컬럼 이름은 schema.ts의 orders·order_edit_histories와 같아야 한다(raw SQL이라 타입이 지켜주지 않는다).
 */
export const applyBulkStatusChange = async ({
  targets,
  next,
  actor,
  now,
}: {
  targets: string[];
  next: OrderStatusTypes;
  actor: OrderActor;
  now: Date;
}): Promise<string[]> => {
  if (targets.length === 0) return [];

  const at = now.toISOString();
  const inList = (values: string[]) =>
    sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    );
  const setInvoiceRegisteredAt =
    next === 'INVOICE_REGISTER' ? sql`, invoice_registered_at = ${at}::timestamptz` : sql``;

  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE orders
      SET order_status = ${next}${setInvoiceRegisteredAt}
      WHERE owner_id = ${actor.ownerId}
        AND order_number IN (${inList(targets)})
        AND order_status IN (${inList(allowedFromStatuses(next))})
      RETURNING order_number
    )
    INSERT INTO order_edit_histories (order_number, owner_id, changed_fields, modified_by_name, modified_by_email, modified_at)
    SELECT order_number, ${actor.ownerId}, '["orderStatus"]'::jsonb, ${actor.name}, ${actor.email}, ${at}::timestamptz
    FROM updated
    RETURNING order_number
  `);

  return (result.rows as { order_number: string }[]).map((row) => row.order_number);
};
