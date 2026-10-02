import { describe, expect, it } from 'vitest';
import {
  findConfirmViolation,
  findInvoiceSendViolation,
  ORDER_INVOICE_REQUIRED_MESSAGE,
  ORDER_INVOICE_SEND_ONLY_MESSAGE,
  ORDER_NOT_FOUND_MESSAGE,
  ORDER_STATUS_RACE_MESSAGE,
  OrderStatusSnapshot,
  OrderSyncSnapshot,
  planBulkStatusChange,
  planConfirmOrders,
  planInvoiceSend,
  toBulkStatusResult,
  toMallSyncResult,
} from './orderBulkStatus';
import { formatMallSyncFailure } from './orderMallSync';
import { ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE, ORDER_STATUS_LOCKED_MESSAGE } from './orderStatusRule';

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

const syncRow = (
  orderNumber: string,
  orderStatus: OrderSyncSnapshot['orderStatus'],
  shoppingAccountId: string | null,
  invoice = false,
): OrderSyncSnapshot => ({
  ...row(orderNumber, orderStatus, invoice),
  shoppingAccountId,
  shopOrderNumber: `shop_${orderNumber}`,
});

describe('planConfirmOrders', () => {
  it('신규주문은 상태 변경, 계정 있는 발주확인은 몰에만 재전송, 계정 없는 발주확인은 변경 없음, 그 밖은 위반', () => {
    const plan = planConfirmOrders(
      ['new', 'resend', 'local', 'cancel', 'ghost'],
      [
        syncRow('new', 'NEW_ORDER', null),
        syncRow('resend', 'CONFIRMED_ORDER', 'acc'),
        syncRow('local', 'CONFIRMED_ORDER', null),
        syncRow('cancel', 'REQUEST_CANCEL', 'acc'),
      ],
    );
    expect(plan.changeTargets.map((t) => t.orderNumber)).toEqual(['new']);
    expect(plan.resendTargets.map((t) => t.orderNumber)).toEqual(['resend']);
    expect(plan.unchangedCount).toBe(1);
    expect(plan.failures).toEqual([
      { id: 'cancel', message: ORDER_CONFIRM_ONLY_FROM_NEW_MESSAGE },
      { id: 'ghost', message: ORDER_NOT_FOUND_MESSAGE },
    ]);
  });
});

describe('findInvoiceSendViolation / planInvoiceSend', () => {
  it('송장등록 + 택배사·송장번호가 있어야 전송 대상이다', () => {
    expect(
      findInvoiceSendViolation({ orderStatus: 'INVOICE_REGISTER', deliveryCompany: 'CJ', invoiceNumber: '1' }),
    ).toBeNull();
    expect(
      findInvoiceSendViolation({ orderStatus: 'INVOICE_REGISTER', deliveryCompany: null, invoiceNumber: '1' }),
    ).toBe(ORDER_INVOICE_SEND_ONLY_MESSAGE);
    expect(findInvoiceSendViolation({ orderStatus: 'CONFIRMED_ORDER' })).toBe(ORDER_INVOICE_SEND_ONLY_MESSAGE);
  });

  it('대상과 실패를 나눈다', () => {
    const plan = planInvoiceSend(
      ['ok', 'done', 'ghost'],
      [syncRow('ok', 'INVOICE_REGISTER', 'acc', true), syncRow('done', 'INVOICE_COMPLETE', 'acc', true)],
    );
    expect(plan.changeTargets).toEqual([
      {
        orderNumber: 'ok',
        shoppingAccountId: 'acc',
        shopOrderNumber: 'shop_ok',
        deliveryCompany: 'CJ',
        invoiceNumber: '123',
      },
    ]);
    expect(plan.resendTargets).toEqual([]);
    expect(plan.failures).toEqual([
      { id: 'done', message: ORDER_INVOICE_SEND_ONLY_MESSAGE },
      { id: 'ghost', message: ORDER_NOT_FOUND_MESSAGE },
    ]);
  });
});

describe('toMallSyncResult', () => {
  it('몰 성공 + UPDATE됨만 성공, 몰 성공인데 UPDATE 안 됨은 경합, 몰 실패는 동작 이름을 붙인 사유', () => {
    const plan = planConfirmOrders(
      ['a', 'b', 'c', 'r1', 'r2', 'local'],
      [
        syncRow('a', 'NEW_ORDER', 'acc'),
        syncRow('b', 'NEW_ORDER', 'acc'),
        syncRow('c', 'NEW_ORDER', 'acc'),
        syncRow('r1', 'CONFIRMED_ORDER', 'acc'),
        syncRow('r2', 'CONFIRMED_ORDER', 'acc'),
        syncRow('local', 'CONFIRMED_ORDER', null),
      ],
    );
    const result = toMallSyncResult({
      plan,
      outcomes: [
        { orderNumber: 'a', ok: true, viaMall: true },
        { orderNumber: 'b', ok: true, viaMall: true },
        { orderNumber: 'c', ok: false, message: '사유' },
        { orderNumber: 'r1', ok: true, viaMall: true },
        { orderNumber: 'r2', ok: false, message: '재전송 사유' },
      ],
      updated: ['a'],
      action: 'CONFIRM',
    });
    expect(result).toEqual({
      successCount: 3, // a + r1 + local(변경 없음)
      failures: [
        { id: 'b', message: ORDER_STATUS_RACE_MESSAGE },
        { id: 'c', message: formatMallSyncFailure('CONFIRM', '사유') },
        { id: 'r2', message: formatMallSyncFailure('CONFIRM', '재전송 사유') },
      ],
    });
  });
});

describe('송장등록 주문의 발주확인 재전송 (최종 리뷰 반영)', () => {
  it('계정 있는 송장등록 주문은 몰에만 재전송, 계정 없는 송장등록은 잠김 위반', () => {
    const plan = planConfirmOrders(
      ['reg', 'regLocal'],
      [syncRow('reg', 'INVOICE_REGISTER', 'acc', true), syncRow('regLocal', 'INVOICE_REGISTER', null, true)],
    );
    expect(plan.resendTargets.map((t) => t.orderNumber)).toEqual(['reg']);
    expect(plan.changeTargets).toEqual([]);
    expect(plan.failures).toEqual([{ id: 'regLocal', message: ORDER_STATUS_LOCKED_MESSAGE }]);
  });

  it('화면 사전 경고도 같은 판정을 쓴다', () => {
    expect(findConfirmViolation({ orderStatus: 'INVOICE_REGISTER', shoppingAccountId: 'acc' })).toBeNull();
    expect(findConfirmViolation({ orderStatus: 'CONFIRMED_ORDER', shoppingAccountId: 'acc' })).toBeNull();
    expect(findConfirmViolation({ orderStatus: 'CONFIRMED_ORDER' })).toBeNull();
    expect(findConfirmViolation({ orderStatus: 'NEW_ORDER' })).toBeNull();
    expect(findConfirmViolation({ orderStatus: 'INVOICE_REGISTER' })).toBe(ORDER_STATUS_LOCKED_MESSAGE);
    expect(findConfirmViolation({ orderStatus: 'INVOICE_COMPLETE', shoppingAccountId: 'acc' })).toBe(
      ORDER_STATUS_LOCKED_MESSAGE,
    );
  });
});
