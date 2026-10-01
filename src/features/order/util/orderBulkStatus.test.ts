import { describe, expect, it } from 'vitest';
import {
  ORDER_INVOICE_REQUIRED_MESSAGE,
  ORDER_NOT_FOUND_MESSAGE,
  ORDER_STATUS_RACE_MESSAGE,
  OrderStatusSnapshot,
  planBulkStatusChange,
  toBulkStatusResult,
} from './orderBulkStatus';
import { ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE } from './orderStatusRule';

const row = (
  orderNumber: string,
  orderStatus: OrderStatusSnapshot['orderStatus'],
  invoice = false,
): OrderStatusSnapshot => ({
  orderNumber,
  orderStatus,
  deliveryCompany: invoice ? 'CJ' : null,
  invoiceNumber: invoice ? '123' : null,
});

describe('planBulkStatusChange', () => {
  it('없는·남의 주문은 실패, 이미 같은 상태는 변경 없는 성공, 규칙 위반은 사유와 함께 실패', () => {
    const plan = planBulkStatusChange(
      ['new', 'same', 'cancel', 'ghost'],
      [row('new', 'NEW_ORDER'), row('same', 'CONFIRMED_ORDER'), row('cancel', 'REQUEST_CANCEL')],
      'CONFIRMED_ORDER',
    );
    expect(plan).toEqual({
      targets: ['new'],
      unchangedCount: 1,
      failures: [
        { id: 'cancel', message: ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE },
        { id: 'ghost', message: ORDER_NOT_FOUND_MESSAGE },
      ],
    });
  });

  it('송장등록으로는 택배사·송장번호가 있는 주문만 바꾼다', () => {
    const plan = planBulkStatusChange(
      ['a', 'b'],
      [row('a', 'CONFIRMED_ORDER', true), row('b', 'CONFIRMED_ORDER')],
      'INVOICE_REGISTER',
    );
    expect(plan.targets).toEqual(['a']);
    expect(plan.failures).toEqual([{ id: 'b', message: ORDER_INVOICE_REQUIRED_MESSAGE }]);
  });
});

describe('toBulkStatusResult', () => {
  it('대상 중 UPDATE되지 않은 것은 경합 실패로 센다', () => {
    const plan = { targets: ['a', 'b'], unchangedCount: 1, failures: [{ id: 'x', message: 'm' }] };
    expect(toBulkStatusResult(plan, ['a'])).toEqual({
      successCount: 2,
      failures: [
        { id: 'x', message: 'm' },
        { id: 'b', message: ORDER_STATUS_RACE_MESSAGE },
      ],
    });
  });
});
