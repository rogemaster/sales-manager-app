import { OrderStatus, OrderStatusTypes } from '../types/order.types';
import { ORDER_CANCEL_STATUS_TYPE, ORDER_STATUS, ORDER_STATUS_CODES } from '../constant/status.constants';

/**
 * 주문상태 변경 규칙. 상세 PATCH·상태 일괄변경 두 route와 목록 화면의 사전 경고가 이 함수 하나를 쓴다.
 * 전이표(상태별 다음 상태)는 수집 동작을 본 뒤 정한다(2026-09-30 사용자 결정 — 목록 화면의 기존 규칙을 서버로 올린 것).
 */

/** 이 상태에 도달한 주문은 상태를 바꿀 수 없다. 송장등록 이후는 송장 전송이, 완료 상태는 처리가 끝난 것이다. */
export const LOCKED_ORDER_STATUSES: readonly OrderStatusTypes[] = [
  'INVOICE_REGISTER',
  'INVOICE_COMPLETE',
  'COMPLETE_CANCEL',
  'COMPLETE_EXCHANGE',
  'COMPLETE_RETURN',
];

/** 송장전송(POST /api/orders/invoice/send)만 이 상태로 바꾼다. 사용자가 고르면 전송 없이 전송완료가 되고 송장전송완료일도 비게 된다. */
const SYSTEM_ONLY_ORDER_STATUSES: readonly OrderStatusTypes[] = ['INVOICE_COMPLETE'];

export const ORDER_STATUS_LOCKED_MESSAGE =
  '송장등록, 송장전송완료, 취소완료, 교환완료, 반품완료 상태인 주문은 상태를 변경할 수 없습니다.';
export const ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE = '신규주문 상태인 주문건만 발주확인으로 변경할 수 있습니다.';
export const ORDER_STATUS_SYSTEM_ONLY_MESSAGE = '송장전송완료는 송장 전송으로만 변경됩니다.';
export const ORDER_NEW_ORDER_NEXT_MESSAGE =
  '신규주문 상태인 주문건은 발주확인 또는 취소 관련 상태로만 변경할 수 있습니다.';
export const INVALID_ORDER_STATUS_MESSAGE = '주문 상태가 올바르지 않습니다.';

/**
 * 신규주문이 갈 수 있는 상태(2026-10-02 사용자 요청: "신규주문의 경우 발주확인, 취소관련상태로만 변경 가능").
 * 송장등록으로 바로 가면 몰은 발주확인을 모른 채 송장을 받게 되고, 교환·반품은 배송 전 주문에 성립하지 않는다.
 */
const NEW_ORDER_NEXT_STATUSES: readonly OrderStatusTypes[] = [
  'CONFIRMED_ORDER',
  ...ORDER_CANCEL_STATUS_TYPE.map(({ id }) => id as OrderStatusTypes),
];

/** 위반이면 사유, 아니면 null. 같은 상태로의 "변경"은 변경이 아니므로 잠긴 상태여도 통과한다(주소만 고치는 저장). */
export const findOrderStatusChangeViolation = (current: OrderStatusTypes, next: OrderStatusTypes): string | null => {
  if (current === next) return null;
  if (LOCKED_ORDER_STATUSES.includes(current)) return ORDER_STATUS_LOCKED_MESSAGE;
  if (SYSTEM_ONLY_ORDER_STATUSES.includes(next)) return ORDER_STATUS_SYSTEM_ONLY_MESSAGE;
  if (current === 'NEW_ORDER' && !NEW_ORDER_NEXT_STATUSES.includes(next)) return ORDER_NEW_ORDER_NEXT_MESSAGE;
  if (next === 'CONFIRMED_ORDER' && current !== 'NEW_ORDER') return ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE;
  return null;
};

/** 상태 Select 선택지. 목록 일괄변경이 쓴다(여러 주문을 고르므로 현재 상태로 거를 수 없다). */
export const USER_SELECTABLE_ORDER_STATUS: OrderStatus[] = ORDER_STATUS.filter(
  ({ id }) => !SYSTEM_ONLY_ORDER_STATUSES.includes(id as OrderStatusTypes),
);

/**
 * 상세 화면 상태 Select 선택지 — 현재 상태 + 현재 상태에서 바꿀 수 있는 상태(2026-10-02 사용자 요청).
 * 고를 수 있는 것만 보여 서버 400을 만나지 않게 한다. 현재 상태는 늘 남긴다 — 빠지면 Select가 빈 값으로 보인다.
 */
export const selectableOrderStatuses = (current: OrderStatusTypes): OrderStatus[] =>
  ORDER_STATUS.filter(
    ({ id }) =>
      id === current ||
      (USER_SELECTABLE_ORDER_STATUS.some((status) => status.id === id) &&
        findOrderStatusChangeViolation(current, id as OrderStatusTypes) === null),
  );

/**
 * next로 바꿀 수 있는 현재 상태 목록. 일괄변경 UPDATE의 WHERE에 넣어, 확인한 뒤 다른 사람이 먼저 바꾼 주문을 덮어쓰지 않는다.
 * next 자신은 빠진다 — 이미 그 상태인 주문은 UPDATE 대상이 아니다.
 */
export const allowedFromStatuses = (next: OrderStatusTypes): OrderStatusTypes[] =>
  ORDER_STATUS_CODES.filter((status) => status !== next && findOrderStatusChangeViolation(status, next) === null);
