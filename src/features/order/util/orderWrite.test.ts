import { describe, expect, it } from 'vitest';
import {
  buildOrderUpdate,
  diffOrderFields,
  ORDER_INVOICE_COMPANY_REQUIRED_MESSAGE,
  ORDER_INVOICE_NUMBER_REQUIRED_MESSAGE,
  orderWriteSchema,
  OrderWriteValues,
  resolveRequestedStatus,
} from './orderWrite';
import { OrderRow } from './orderRecord';

const values: OrderWriteValues = {
  orderName: '주문자',
  orderPhoneNumber: '01012345678',
  orderZipCode: '06236',
  orderAddress: '서울',
  orderDetailAddress: '',
  payeeName: '수취인',
  payeePhoneNumber: '010-1234-5678',
  payeeZipCode: '06236',
  payeeAddress: '서울',
  payeeDetailAddress: undefined,
  deliveryMessage: '',
  orderStatus: 'NEW_ORDER',
  deliveryCompany: '',
  invoiceNumber: '',
};

const firstMessage = (input: unknown) => {
  const result = orderWriteSchema.safeParse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe('orderWriteSchema', () => {
  it('① 몰 원본 필드는 결과에서 빠진다 — 폼이 주문 객체를 통째로 보내도', () => {
    const parsed = orderWriteSchema.parse({ ...values, orderPrice: 1, orderProductName: '바꾼 이름', ownerId: 'x' });
    expect(parsed).not.toHaveProperty('orderPrice');
    expect(parsed).not.toHaveProperty('orderProductName');
    expect(parsed).not.toHaveProperty('ownerId');
  });

  it('송장등록이면 택배사·송장번호가 필수다', () => {
    expect(firstMessage({ ...values, orderStatus: 'INVOICE_REGISTER' })).toBe(ORDER_INVOICE_COMPANY_REQUIRED_MESSAGE);
    expect(firstMessage({ ...values, orderStatus: 'INVOICE_REGISTER', deliveryCompany: 'CJ' })).toBe(
      ORDER_INVOICE_NUMBER_REQUIRED_MESSAGE,
    );
    expect(
      firstMessage({ ...values, orderStatus: 'INVOICE_REGISTER', deliveryCompany: 'CJ', invoiceNumber: '123' }),
    ).toBeNull();
  });

  it('연락처 형식이 틀리면 거절한다', () => {
    expect(firstMessage({ ...values, orderPhoneNumber: '12-34' })).not.toBeNull();
  });

  it('목록 밖 택배사·상태는 거절한다', () => {
    expect(firstMessage({ ...values, deliveryCompany: 'UNKNOWN' })).not.toBeNull();
    expect(firstMessage({ ...values, orderStatus: 'SHIPPED' })).not.toBeNull();
  });

  it('클레임은 처리메모만 남긴다', () => {
    const parsed = orderWriteSchema.parse({
      ...values,
      claim: { claimType: 'CANCEL', claimMessage: 'x', handlerNote: '메모' },
    });
    expect(parsed.claim).toEqual({ handlerNote: '메모' });
  });
});

describe('buildOrderUpdate', () => {
  const now = new Date('2026-09-30T00:00:00.000Z');

  it('① 필드를 넣어 보내도 결과에 없다', () => {
    const update = buildOrderUpdate({ ...values, orderPrice: 999 } as unknown as OrderWriteValues, 'NEW_ORDER', now);
    expect(update).not.toHaveProperty('orderPrice');
    expect(update).not.toHaveProperty('orderProductName');
    expect(update).not.toHaveProperty('mallCode');
  });

  it('빈 문자열 선택 필드는 null로 저장한다', () => {
    const update = buildOrderUpdate(values, 'NEW_ORDER', now);
    expect(update.orderDetailAddress).toBeNull();
    expect(update.deliveryCompany).toBeNull();
  });

  it('송장등록으로 "바뀔 때만" 송장등록일을 넣는다', () => {
    const invoice = { ...values, orderStatus: 'INVOICE_REGISTER' as const, deliveryCompany: 'CJ', invoiceNumber: '1' };
    expect(buildOrderUpdate(invoice, 'CONFIRMED_ORDER', now).invoiceRegisteredAt).toEqual(now);
    expect(buildOrderUpdate(invoice, 'INVOICE_REGISTER', now)).not.toHaveProperty('invoiceRegisteredAt');
  });
});

describe('diffOrderFields', () => {
  const current = {
    orderName: '주문자',
    orderPhoneNumber: '01012345678',
    orderZipCode: '06236',
    orderAddress: '서울',
    orderDetailAddress: null,
    payeeName: '수취인',
    payeePhoneNumber: '010-1234-5678',
    payeeZipCode: '06236',
    payeeAddress: '서울',
    payeeDetailAddress: null,
    deliveryMessage: null,
    orderStatus: 'NEW_ORDER' as const,
    deliveryCompany: null,
    invoiceNumber: null,
  } satisfies Partial<OrderRow>;
  const now = new Date();

  it('null과 빈 값이 섞여도 같은 값이면 빈 배열이다', () => {
    expect(diffOrderFields(current, buildOrderUpdate(values, 'NEW_ORDER', now))).toEqual([]);
  });

  it('바뀐 필드 키만 돌려준다', () => {
    const update = buildOrderUpdate(
      { ...values, payeeName: '다른 사람', orderStatus: 'CONFIRMED_ORDER' },
      'NEW_ORDER',
      now,
    );
    expect(diffOrderFields(current, update)).toEqual(['payeeName', 'orderStatus']);
  });

  it('클레임 메모 변경은 claim.handlerNote로 센다 — 보내지 않았으면 세지 않는다', () => {
    const update = buildOrderUpdate(values, 'NEW_ORDER', now);
    expect(diffOrderFields(current, update, { current: '', next: '새 메모' })).toEqual(['claim.handlerNote']);
    expect(diffOrderFields(current, update, { current: '메모', next: undefined })).toEqual([]);
  });
});

describe('resolveRequestedStatus', () => {
  it('폼이 불러온 상태를 그대로 보냈으면(사용자가 상태를 안 건드림) 현재 DB 상태를 유지한다', () => {
    // A가 NEW_ORDER로 폼을 연 사이 B가 발주확인으로 바꿨다 — A의 주소 저장이 상태를 되돌리면 안 된다.
    expect(resolveRequestedStatus('CONFIRMED_ORDER', 'NEW_ORDER', 'NEW_ORDER')).toBe('CONFIRMED_ORDER');
  });

  it('사용자가 상태를 바꿨으면 요청한 상태다', () => {
    expect(resolveRequestedStatus('NEW_ORDER', 'NEW_ORDER', 'REQUEST_CANCEL')).toBe('REQUEST_CANCEL');
  });

  it('불러온 상태를 모르면(옛 클라이언트) 요청한 상태다', () => {
    expect(resolveRequestedStatus('CONFIRMED_ORDER', undefined, 'NEW_ORDER')).toBe('NEW_ORDER');
  });
});

describe('orderWriteSchema baseStatus', () => {
  it('불러온 상태를 받고, 목록 밖 값은 거절한다', () => {
    expect(orderWriteSchema.parse({ ...values, baseStatus: 'NEW_ORDER' }).baseStatus).toBe('NEW_ORDER');
    expect(firstMessage({ ...values, baseStatus: 'SHIPPED' })).not.toBeNull();
  });
});
