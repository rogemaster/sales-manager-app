import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { BulkOrderStatusResult, MallSyncAction, OrderStatusTypes } from '../types/order.types';
import { MallSyncPlan, toMallSyncResult } from '../util/orderBulkStatus';
import { MallSyncTarget } from '../util/orderMallSync';
import { allowedFromStatuses } from '../util/orderStatusRule';
import { syncOrdersToMall } from './orderMallSync';
import { OrderActor } from './orderStore';

const inList = (values: string[]) =>
  sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );

/**
 * 같은 동작이 성공하면 그 동작의 실패 사유만 비운다 — 발주확인 성공이 송장전송 실패 사유를 지우면 안 된다.
 * SET의 우변은 UPDATE 전 값을 읽으므로 두 CASE가 같은 기준으로 판정한다. 상세 저장(drizzle set)이 쓴다.
 */
export const clearMallSyncColumns = (action: MallSyncAction) => ({
  mallSyncAction: sql`CASE WHEN ${orders.mallSyncAction} = ${action} THEN NULL ELSE ${orders.mallSyncAction} END`,
  mallSyncError: sql`CASE WHEN ${orders.mallSyncAction} = ${action} THEN NULL ELSE ${orders.mallSyncError} END`,
});

/**
 * 상태 변경 + 이력 INSERT를 CTE 한 문장으로 실행한다 — 한 문장이라 원자적이다.
 * 두 문장으로 나누면 이력 INSERT만 실패했을 때 "상태는 바뀌었는데 이력이 없음"이 된다.
 * batch로 묶을 수 없는 이유: 이력은 실제로 UPDATE된 주문에만 써야 하는데, 그 목록은 UPDATE가 끝나야 안다.
 * WHERE의 출발 상태 조건이 "확인한 뒤 다른 사람이 먼저 바꾼 주문"을 덮어쓰지 않게 막는다.
 * 테이블·컬럼 이름은 schema.ts의 orders·order_edit_histories와 같아야 한다(raw SQL이라 타입이 지켜주지 않는다).
 *
 * fromStatuses: 송장전송완료는 사용자가 고를 수 없는 상태라 allowedFromStatuses가 비어 있다 — 송장전송이 ['INVOICE_REGISTER']를 넘긴다.
 * mall: 몰 연동 결과로 바꾸는 경우. 그 동작의 실패 사유를 비우고, 몰을 실제로 부른 주문(viaMall)의 이력에 mall_action을 남긴다.
 */
export const applyBulkStatusChange = async ({
  targets,
  next,
  actor,
  now,
  fromStatuses = allowedFromStatuses(next),
  mall,
}: {
  targets: string[];
  next: OrderStatusTypes;
  actor: OrderActor;
  now: Date;
  fromStatuses?: OrderStatusTypes[];
  mall?: { action: MallSyncAction; viaMall: string[] };
}): Promise<string[]> => {
  if (targets.length === 0 || fromStatuses.length === 0) return [];

  const at = now.toISOString();
  const setInvoiceRegisteredAt =
    next === 'INVOICE_REGISTER' ? sql`, invoice_registered_at = ${at}::timestamptz` : sql``;
  const setInvoiceSentAt = next === 'INVOICE_COMPLETE' ? sql`, invoice_sent_at = ${at}::timestamptz` : sql``;
  const setClearMallSync = mall
    ? sql`, mall_sync_action = CASE WHEN mall_sync_action = ${mall.action} THEN NULL ELSE mall_sync_action END,
         mall_sync_error = CASE WHEN mall_sync_action = ${mall.action} THEN NULL ELSE mall_sync_error END`
    : sql``;
  const historyMallAction =
    mall && mall.viaMall.length > 0
      ? sql`CASE WHEN order_number IN (${inList(mall.viaMall)}) THEN ${mall.action}::text ELSE NULL END`
      : sql`NULL`;

  const result = await db.execute(sql`
    WITH updated AS (
      UPDATE orders
      SET order_status = ${next}${setInvoiceRegisteredAt}${setInvoiceSentAt}${setClearMallSync}
      WHERE owner_id = ${actor.ownerId}
        AND order_number IN (${inList(targets)})
        AND order_status IN (${inList(fromStatuses)})
      RETURNING order_number
    )
    INSERT INTO order_edit_histories (order_number, owner_id, changed_fields, modified_by_name, modified_by_email, modified_at, mall_action)
    SELECT order_number, ${actor.ownerId}, '["orderStatus"]'::jsonb, ${actor.name}, ${actor.email}, ${at}::timestamptz, ${historyMallAction}
    FROM updated
    RETURNING order_number
  `);

  return (result.rows as { order_number: string }[]).map((row) => row.order_number);
};

/**
 * 몰 연동 실패: 상태는 그대로, 실패 사유를 주문에 남기고 실패 이력(changed_fields = [])을 쓴다. CTE 한 문장.
 * 사유가 주문마다 달라 VALUES 목록과 조인한다.
 */
export const recordMallSyncFailures = async ({
  failures,
  action,
  actor,
  now,
}: {
  failures: { orderNumber: string; message: string }[];
  action: MallSyncAction;
  actor: OrderActor;
  now: Date;
}): Promise<void> => {
  if (failures.length === 0) return;
  const at = now.toISOString();
  const rows = sql.join(
    failures.map(({ orderNumber, message }) => sql`(${orderNumber}::text, ${message}::text)`),
    sql`, `,
  );
  await db.execute(sql`
    WITH failed(order_number, message) AS (VALUES ${rows}),
    updated AS (
      UPDATE orders AS o
      SET mall_sync_action = ${action}, mall_sync_error = f.message
      FROM failed AS f
      WHERE o.owner_id = ${actor.ownerId} AND o.order_number = f.order_number
      RETURNING o.order_number, f.message
    )
    INSERT INTO order_edit_histories (order_number, owner_id, changed_fields, modified_by_name, modified_by_email, modified_at, mall_action, mall_error)
    SELECT order_number, ${actor.ownerId}, '[]'::jsonb, ${actor.name}, ${actor.email}, ${at}::timestamptz, ${action}::text, message
    FROM updated
  `);
};

/** 발주확인 재전송 성공 — 상태·이력은 그대로, 같은 동작의 실패 사유만 비운다. */
export const clearMallSyncFailure = async ({
  orderNumbers,
  action,
  ownerId,
}: {
  orderNumbers: string[];
  action: MallSyncAction;
  ownerId: string;
}): Promise<void> => {
  if (orderNumbers.length === 0) return;
  await db.execute(sql`
    UPDATE orders SET mall_sync_action = NULL, mall_sync_error = NULL
    WHERE owner_id = ${ownerId} AND order_number IN (${inList(orderNumbers)}) AND mall_sync_action = ${action}
  `);
};

/**
 * 몰 먼저 → DB(스펙 결정 7). 발주확인 일괄변경과 송장전송 두 route가 같은 순서를 쓴다 — 한 벌만 바뀌면 동작이 갈린다.
 * 몰은 성공했는데 성공 쓰기가 실패하면 예외가 그대로 올라가 500이 된다 — 다시 시도하면 몰 쪽이 멱등이라 회복된다.
 * 실패 기록·재전송 사유 지우기는 부수 기록이라 실패해도 결과를 바꾸지 않는다(수집 결과 저장과 같은 원칙).
 */
export const runMallSyncedChange = async ({
  plan,
  action,
  next,
  fromStatuses,
  actor,
  now,
}: {
  plan: MallSyncPlan;
  action: MallSyncAction;
  next: OrderStatusTypes;
  fromStatuses: OrderStatusTypes[];
  actor: OrderActor;
  now: Date;
}): Promise<BulkOrderStatusResult> => {
  const targets: MallSyncTarget[] = [...plan.changeTargets, ...plan.resendTargets];
  const outcomes = targets.length > 0 ? await syncOrdersToMall({ action, targets, ownerId: actor.ownerId }) : [];

  const changeNumbers = new Set(plan.changeTargets.map((target) => target.orderNumber));
  const toChange: string[] = [];
  const viaMall: string[] = [];
  const resent: string[] = [];
  const failed: { orderNumber: string; message: string }[] = [];
  for (const outcome of outcomes) {
    if (!outcome.ok) {
      failed.push({ orderNumber: outcome.orderNumber, message: outcome.message });
    } else if (changeNumbers.has(outcome.orderNumber)) {
      toChange.push(outcome.orderNumber);
      if (outcome.viaMall) viaMall.push(outcome.orderNumber);
    } else {
      resent.push(outcome.orderNumber);
    }
  }

  const updated = await applyBulkStatusChange({
    targets: toChange,
    next,
    actor,
    now,
    fromStatuses,
    mall: { action, viaMall },
  });

  try {
    await clearMallSyncFailure({ orderNumbers: resent, action, ownerId: actor.ownerId });
    await recordMallSyncFailures({ failures: failed, action, actor, now });
  } catch (error) {
    console.error('몰 연동 결과 기록 실패:', error);
  }

  return toMallSyncResult({ plan, outcomes, updated, action });
};
