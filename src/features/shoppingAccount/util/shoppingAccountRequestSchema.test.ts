import { describe, it, expect } from 'vitest';
import { INVALID_FILTER_MESSAGE, INVALID_SEARCH_DATE_MESSAGE } from '@/shared/utils/listRequest';
import { shoppingAccountListRequestSchema, shoppingAccountsByMallRequestSchema } from './shoppingAccountRequestSchema';

const FILTERS = {
  dateType: 'createdAt',
  startDate: '2026-09-01',
  endDate: '2026-09-26',
  isActive: 'ALL',
  mallCode: 'ALL',
  searchValue: '',
};

const messageOf = (body: unknown) => shoppingAccountListRequestSchema.safeParse(body).error?.issues[0]?.message;

describe('shoppingAccountListRequestSchema', () => {
  it('화면이 보내는 요청을 통과시킨다', () => {
    const body = { filters: { ...FILTERS, isActive: 'true', mallCode: 'NSST' }, page: 1, pageSize: 10 };
    expect(shoppingAccountListRequestSchema.parse(body)).toEqual(body);
  });

  it('pageSize 상한은 다른 목록과 같은 100이다', () => {
    expect(shoppingAccountListRequestSchema.parse({ filters: FILTERS, page: 1, pageSize: 1000 }).pageSize).toBe(100);
  });

  it('필터 코드와 날짜가 틀리면 거절한다', () => {
    expect(messageOf({ filters: { ...FILTERS, isActive: true } })).toBe(INVALID_FILTER_MESSAGE);
    expect(messageOf({ filters: { ...FILTERS, mallCode: 'NOPE' } })).toBe(INVALID_FILTER_MESSAGE);
    expect(messageOf({ filters: { ...FILTERS, endDate: '2026-13-01' } })).toBe(INVALID_SEARCH_DATE_MESSAGE);
  });
});

describe('shoppingAccountsByMallRequestSchema', () => {
  it('쇼핑몰 코드 목록 밖이면 거절한다', () => {
    expect(shoppingAccountsByMallRequestSchema.safeParse({ mallCode: 'NSST' }).success).toBe(true);
    for (const mallCode of ['NOPE', undefined]) {
      expect(shoppingAccountsByMallRequestSchema.safeParse({ mallCode }).error?.issues[0]?.message).toBe(
        '쇼핑몰 값이 올바르지 않습니다.',
      );
    }
  });
});
