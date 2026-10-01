import { describe, expect, it } from 'vitest';
import {
  allowedFromStatuses,
  findOrderStatusChangeViolation,
  ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE,
  ORDER_STATUS_LOCKED_MESSAGE,
  ORDER_STATUS_SYSTEM_ONLY_MESSAGE,
  USER_SELECTABLE_ORDER_STATUS,
} from './orderStatusRule';

describe('findOrderStatusChangeViolation', () => {
  it('같은 상태는 변경이 아니라 항상 통과한다 — 잠긴 상태여도', () => {
    expect(findOrderStatusChangeViolation('INVOICE_REGISTER', 'INVOICE_REGISTER')).toBeNull();
    expect(findOrderStatusChangeViolation('COMPLETE_RETURN', 'COMPLETE_RETURN')).toBeNull();
  });

  it.each(['INVOICE_REGISTER', 'INVOICE_COMPLETE', 'COMPLETE_CANCEL', 'COMPLETE_EXCHANGE', 'COMPLETE_RETURN'] as const)(
    '%s에서는 다른 상태로 바꿀 수 없다',
    (current) => {
      expect(findOrderStatusChangeViolation(current, 'NEW_ORDER')).toBe(ORDER_STATUS_LOCKED_MESSAGE);
    },
  );

  it('발주확인으로는 신규주문에서만 바꿀 수 있다', () => {
    expect(findOrderStatusChangeViolation('NEW_ORDER', 'CONFIRMED_ORDER')).toBeNull();
    expect(findOrderStatusChangeViolation('REQUEST_CANCEL', 'CONFIRMED_ORDER')).toBe(
      ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE,
    );
  });

  it('송장전송완료는 사용자가 고를 수 없다', () => {
    expect(findOrderStatusChangeViolation('CONFIRMED_ORDER', 'INVOICE_COMPLETE')).toBe(
      ORDER_STATUS_SYSTEM_ONLY_MESSAGE,
    );
  });

  it('그 밖의 변경은 통과한다', () => {
    expect(findOrderStatusChangeViolation('CONFIRMED_ORDER', 'INVOICE_REGISTER')).toBeNull();
    expect(findOrderStatusChangeViolation('NEW_ORDER', 'REQUEST_CANCEL')).toBeNull();
  });
});

describe('USER_SELECTABLE_ORDER_STATUS', () => {
  it('송장전송완료를 뺀 12개다', () => {
    expect(USER_SELECTABLE_ORDER_STATUS.map(({ id }) => id)).not.toContain('INVOICE_COMPLETE');
    expect(USER_SELECTABLE_ORDER_STATUS).toHaveLength(12);
  });
});

describe('allowedFromStatuses', () => {
  it('발주확인은 신규주문에서만 출발한다', () => {
    expect(allowedFromStatuses('CONFIRMED_ORDER')).toEqual(['NEW_ORDER']);
  });

  it('출발 상태에 목적 상태 자신과 잠긴 상태는 없다', () => {
    const from = allowedFromStatuses('REQUEST_CANCEL');
    expect(from).not.toContain('REQUEST_CANCEL');
    expect(from).not.toContain('INVOICE_REGISTER');
    expect(from).toContain('NEW_ORDER');
  });
});
