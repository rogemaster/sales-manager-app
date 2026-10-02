import { BulkFailure } from '@/shared/utils/bulkResultAlert';
import { BulkOrderStatusResult, MallSyncAction, OrderStatusTypes } from '../types/order.types';
import { findOrderStatusChangeViolation } from './orderStatusRule';
import { formatMallSyncFailure, MallSyncOutcome, MallSyncTarget } from './orderMallSync';

export const ORDER_NOT_FOUND_MESSAGE = '주문을 찾을 수 없습니다.';
export const ORDER_INVOICE_REQUIRED_MESSAGE = '택배사와 송장번호가 있는 주문만 송장등록으로 변경할 수 있습니다.';
export const ORDER_STATUS_RACE_MESSAGE = '다른 사용자가 먼저 주문 상태를 변경했습니다.';

export interface OrderStatusSnapshot {
  orderNumber: string;
  orderStatus: OrderStatusTypes;
  deliveryCompany: string | null;
  invoiceNumber: string | null;
}

export interface BulkStatusPlan {
  targets: string[];
  unchangedCount: number;
  failures: BulkFailure[];
}

/**
 * 일괄변경 요청을 UPDATE 대상·변경 없음·실패로 나눈다. rows는 소유자 조건으로 읽은 행이라
 * 남의 주문과 없는 주문이 같은 "찾을 수 없음"이 된다(존재 여부를 드러내지 않는다).
 * 이미 목적 상태인 주문은 성공으로 세되 쓰지 않는다 — 쓰면 아무것도 안 바뀐 이력이 남는다.
 */
export const planBulkStatusChange = (
  ids: readonly string[],
  rows: readonly OrderStatusSnapshot[],
  next: OrderStatusTypes,
): BulkStatusPlan => {
  const byNumber = new Map(rows.map((row) => [row.orderNumber, row]));
  const plan: BulkStatusPlan = { targets: [], unchangedCount: 0, failures: [] };

  for (const id of ids) {
    const row = byNumber.get(id);
    if (!row) {
      plan.failures.push({ id, message: ORDER_NOT_FOUND_MESSAGE });
      continue;
    }
    if (row.orderStatus === next) {
      plan.unchangedCount += 1;
      continue;
    }
    const violation = findOrderStatusChangeViolation(row.orderStatus, next);
    if (violation) {
      plan.failures.push({ id, message: violation });
      continue;
    }
    if (next === 'INVOICE_REGISTER' && (!row.deliveryCompany || !row.invoiceNumber)) {
      plan.failures.push({ id, message: ORDER_INVOICE_REQUIRED_MESSAGE });
      continue;
    }
    plan.targets.push(id);
  }
  return plan;
};

/** 대상 중 UPDATE되지 않은 주문은 확인 뒤 다른 사람이 상태를 바꾼 것이다(WHERE의 출발 상태 조건). */
export const toBulkStatusResult = (plan: BulkStatusPlan, updated: readonly string[]): BulkOrderStatusResult => {
  const done = new Set(updated);
  const raced = plan.targets.filter((id) => !done.has(id)).map((id) => ({ id, message: ORDER_STATUS_RACE_MESSAGE }));
  return { successCount: plan.unchangedCount + done.size, failures: [...plan.failures, ...raced] };
};

export const ORDER_INVOICE_SEND_ONLY_MESSAGE = '송장등록 상태인 주문만 전송할 수 있습니다.';

/** 몰 연동 계획에 필요한 값까지 읽은 행. */
export interface OrderSyncSnapshot extends OrderStatusSnapshot {
  shoppingAccountId: string | null;
  shopOrderNumber: string;
}

export const toSyncTarget = (row: OrderSyncSnapshot): MallSyncTarget => ({
  orderNumber: row.orderNumber,
  shoppingAccountId: row.shoppingAccountId,
  shopOrderNumber: row.shopOrderNumber,
  deliveryCompany: row.deliveryCompany,
  invoiceNumber: row.invoiceNumber,
});

/** 송장전송 대상 판정. 목록 화면의 사전 경고와 송장전송 route가 같은 함수를 쓴다. */
export const findInvoiceSendViolation = (order: {
  orderStatus: OrderStatusTypes;
  deliveryCompany?: string | null;
  invoiceNumber?: string | null;
}): string | null =>
  order.orderStatus === 'INVOICE_REGISTER' && order.deliveryCompany && order.invoiceNumber
    ? null
    : ORDER_INVOICE_SEND_ONLY_MESSAGE;

/**
 * changeTargets: 몰 성공 시 상태를 바꿀 주문. resendTargets: 이미 발주확인인데 계정이 있는 주문 —
 * 몰만 미확인일 수 있어 다시 보낸다(스펙 결정 8, 네이버 발주확인은 멱등). 성공해도 상태·이력은 그대로다.
 */
export interface MallSyncPlan {
  changeTargets: MallSyncTarget[];
  resendTargets: MallSyncTarget[];
  unchangedCount: number;
  failures: BulkFailure[];
}

/**
 * 몰에만 발주확인을 다시 보낼 수 있는 상태 — 우리 쪽은 발주확인을 지났는데 몰은 미확인일 수 있다(스펙 결정 8).
 * 송장등록은 발주확인 없이도 된다(신규 → 송장등록). 빼면 그 주문은 송장전송이 NOT_CONFIRMED로 막히고
 * 상태도 잠겨 영영 보낼 수 없다(최종 리뷰 반영). 송장전송완료는 몰이 이미 발송처리한 것이라 대상이 아니다.
 */
const CONFIRM_RESENDABLE_STATUSES: readonly OrderStatusTypes[] = ['CONFIRMED_ORDER', 'INVOICE_REGISTER'];

const isConfirmResendable = (order: { orderStatus: OrderStatusTypes; shoppingAccountId?: string | null }) =>
  !!order.shoppingAccountId && CONFIRM_RESENDABLE_STATUSES.includes(order.orderStatus);

/** 발주확인 판정. 목록 화면의 사전 경고(버튼·Select)와 발주확인 route가 같은 함수를 쓴다. */
export const findConfirmViolation = (order: {
  orderStatus: OrderStatusTypes;
  shoppingAccountId?: string | null;
}): string | null =>
  isConfirmResendable(order) ? null : findOrderStatusChangeViolation(order.orderStatus, 'CONFIRMED_ORDER');

export const planConfirmOrders = (ids: readonly string[], rows: readonly OrderSyncSnapshot[]): MallSyncPlan => {
  const byNumber = new Map(rows.map((row) => [row.orderNumber, row]));
  const plan: MallSyncPlan = { changeTargets: [], resendTargets: [], unchangedCount: 0, failures: [] };

  for (const id of ids) {
    const row = byNumber.get(id);
    if (!row) {
      plan.failures.push({ id, message: ORDER_NOT_FOUND_MESSAGE });
      continue;
    }
    if (isConfirmResendable(row)) {
      plan.resendTargets.push(toSyncTarget(row));
      continue;
    }
    if (row.orderStatus === 'CONFIRMED_ORDER') {
      plan.unchangedCount += 1;
      continue;
    }
    const violation = findOrderStatusChangeViolation(row.orderStatus, 'CONFIRMED_ORDER');
    if (violation) {
      plan.failures.push({ id, message: violation });
      continue;
    }
    plan.changeTargets.push(toSyncTarget(row));
  }
  return plan;
};

export const planInvoiceSend = (ids: readonly string[], rows: readonly OrderSyncSnapshot[]): MallSyncPlan => {
  const byNumber = new Map(rows.map((row) => [row.orderNumber, row]));
  const plan: MallSyncPlan = { changeTargets: [], resendTargets: [], unchangedCount: 0, failures: [] };

  for (const id of ids) {
    const row = byNumber.get(id);
    if (!row) {
      plan.failures.push({ id, message: ORDER_NOT_FOUND_MESSAGE });
      continue;
    }
    const violation = findInvoiceSendViolation(row);
    if (violation) {
      plan.failures.push({ id, message: violation });
      continue;
    }
    plan.changeTargets.push(toSyncTarget(row));
  }
  return plan;
};

/**
 * 몰 결과 + 실제 UPDATE된 주문 → 화면 결과. 몰은 성공했는데 UPDATE되지 않은 주문은 확인 뒤 다른 사람이 상태를 바꾼 것이다
 * (WHERE의 출발 상태 조건) — 성공으로 세지 않는다.
 */
export const toMallSyncResult = (input: {
  plan: MallSyncPlan;
  outcomes: MallSyncOutcome[];
  updated: readonly string[];
  action: MallSyncAction;
}): BulkOrderStatusResult => {
  const { plan, outcomes, updated, action } = input;
  const byNumber = new Map(outcomes.map((outcome) => [outcome.orderNumber, outcome]));
  const done = new Set(updated);
  let successCount = plan.unchangedCount;
  const failures: BulkFailure[] = [...plan.failures];

  const judge = (target: MallSyncTarget, needsUpdate: boolean) => {
    const outcome = byNumber.get(target.orderNumber);
    if (!outcome) return; // 호출자가 모든 대상의 결과를 넘긴다 — 방어용
    if (!outcome.ok) {
      failures.push({ id: target.orderNumber, message: formatMallSyncFailure(action, outcome.message) });
      return;
    }
    if (needsUpdate && !done.has(target.orderNumber)) {
      failures.push({ id: target.orderNumber, message: ORDER_STATUS_RACE_MESSAGE });
      return;
    }
    successCount += 1;
  };

  plan.changeTargets.forEach((target) => judge(target, true));
  plan.resendTargets.forEach((target) => judge(target, false));
  return { successCount, failures };
};
