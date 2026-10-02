import { describe, expect, it } from 'vitest';
import {
  allowedFromStatuses,
  findOrderStatusChangeViolation,
  ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE,
  ORDER_NEW_ORDER_NEXT_MESSAGE,
  ORDER_STATUS_LOCKED_MESSAGE,
  ORDER_STATUS_SYSTEM_ONLY_MESSAGE,
  selectableOrderStatuses,
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

  it('신규주문은 발주확인·취소 관련 상태로만 바꿀 수 있다 (2026-10-02 사용자 요청)', () => {
    for (const next of ['CONFIRMED_ORDER', 'REQUEST_CANCEL', 'PROGRESS_CANCEL', 'COMPLETE_CANCEL'] as const) {
      expect(findOrderStatusChangeViolation('NEW_ORDER', next)).toBeNull();
    }
    for (const next of [
      'INVOICE_REGISTER',
      'REQUEST_EXCHANGE',
      'PROGRESS_EXCHANGE',
      'COMPLETE_EXCHANGE',
      'REQUEST_RETURN',
      'PROGRESS_RETURN',
      'COMPLETE_RETURN',
    ] as const) {
      expect(findOrderStatusChangeViolation('NEW_ORDER', next)).toBe(ORDER_NEW_ORDER_NEXT_MESSAGE);
    }
  });

  it('신규주문에서 송장등록으로는 일괄변경 출발 상태에도 없다', () => {
    expect(allowedFromStatuses('INVOICE_REGISTER')).not.toContain('NEW_ORDER');
    expect(allowedFromStatuses('COMPLETE_CANCEL')).toContain('NEW_ORDER');
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

describe('selectableOrderStatuses (상세 화면 상태 Select)', () => {
  const ids = (current: Parameters<typeof selectableOrderStatuses>[0]) =>
    selectableOrderStatuses(current).map(({ id }) => id);

  it('신규주문은 자기 자신 + 발주확인 + 취소 관련 상태만 보인다', () => {
    expect(ids('NEW_ORDER')).toEqual([
      'NEW_ORDER',
      'CONFIRMED_ORDER',
      'REQUEST_CANCEL',
      'PROGRESS_CANCEL',
      'COMPLETE_CANCEL',
    ]);
  });

  it('발주확인은 신규주문·발주확인으로 되돌아가지 못하고 자기 자신은 남는다', () => {
    const list = ids('CONFIRMED_ORDER');
    expect(list).toContain('CONFIRMED_ORDER');
    expect(list).toContain('INVOICE_REGISTER');
    expect(list).not.toContain('INVOICE_COMPLETE');
  });

  it('선택지는 서버 규칙과 어긋나지 않는다 — 자기 자신 외에는 위반 없는 상태만', () => {
    for (const { id } of USER_SELECTABLE_ORDER_STATUS) {
      const current = id as Parameters<typeof selectableOrderStatuses>[0];
      for (const next of ids(current)) {
        expect(findOrderStatusChangeViolation(current, next as typeof current)).toBeNull();
      }
    }
  });
});
