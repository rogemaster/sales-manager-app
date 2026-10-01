import { BulkFailure } from '@/shared/utils/bulkResultAlert';
import { BulkOrderStatusResult, OrderStatusTypes } from '../types/order.types';
import { findOrderStatusChangeViolation } from './orderStatusRule';

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
