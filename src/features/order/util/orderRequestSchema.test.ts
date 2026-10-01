import { describe, expect, it } from 'vitest';
import {
  escapeLikePattern,
  orderCommentRequestSchema,
  orderListRequestSchema,
  orderStatusBulkRequestSchema,
} from './orderRequestSchema';

const filters = {
  dateType: 'orderCollectionDate',
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  mallCode: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: 'ALL',
  searchType: 'orderName',
  searchValue: '',
};

describe('orderListRequestSchema', () => {
  it.each(['orderCollectionDate', 'paymentDate', 'invoiceRegisteredAt', 'invoiceSentAt'])(
    '날짜 기준 %s를 받는다',
    (dateType) => {
      expect(
        orderListRequestSchema.safeParse({ filters: { ...filters, dateType }, page: 1, pageSize: 20 }).success,
      ).toBe(true);
    },
  );

  it('옛 배송일(deliveryDate)은 거절한다 — 조용히 수집일로 걸러지던 결함', () => {
    expect(
      orderListRequestSchema.safeParse({ filters: { ...filters, dateType: 'deliveryDate' }, page: 1 }).success,
    ).toBe(false);
  });

  it('목록 밖 택배사·상태·검색 기준은 거절한다', () => {
    for (const patch of [{ deliveryCompany: 'DHL' }, { orderStatus: 'SHIPPED' }, { searchType: 'email' }]) {
      expect(orderListRequestSchema.safeParse({ filters: { ...filters, ...patch }, page: 1 }).success).toBe(false);
    }
  });

  it('클라이언트가 보낸 ownerId는 버린다', () => {
    const parsed = orderListRequestSchema.parse({ ownerId: 'someone', filters, page: 1 });
    expect(parsed).not.toHaveProperty('ownerId');
  });
});

describe('orderStatusBulkRequestSchema', () => {
  it('ids 중복을 합치고 상태 코드를 검사한다', () => {
    expect(orderStatusBulkRequestSchema.parse({ ids: ['a', 'a', 'b'], orderStatus: 'CONFIRMED_ORDER' }).ids).toEqual([
      'a',
      'b',
    ]);
    expect(orderStatusBulkRequestSchema.safeParse({ ids: ['a'], orderStatus: 'SHIPPED' }).success).toBe(false);
    expect(orderStatusBulkRequestSchema.safeParse({ orderStatus: 'CONFIRMED_ORDER' }).success).toBe(false);
  });
});

describe('orderCommentRequestSchema', () => {
  it('공백뿐인 코멘트는 거절한다', () => {
    expect(orderCommentRequestSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(orderCommentRequestSchema.parse({ content: ' 확인 ' }).content).toBe('확인');
  });
});

describe('escapeLikePattern', () => {
  it('%·_·\\를 글자로 찾도록 이스케이프한다', () => {
    expect(escapeLikePattern('50%_할인\\')).toBe('50\\%\\_할인\\\\');
    expect(escapeLikePattern('홍길동')).toBe('홍길동');
  });
});
