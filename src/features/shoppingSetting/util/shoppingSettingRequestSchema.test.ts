import { describe, it, expect } from 'vitest';
import { INVALID_FILTER_MESSAGE } from '@/shared/utils/listRequest';
import { mallAddressBookRequestSchema, shoppingSettingListRequestSchema } from './shoppingSettingRequestSchema';

const FILTERS = {
  dateType: 'updatedAt',
  startDate: '2026-09-01',
  endDate: '2026-09-26',
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  searchValue: '',
};

describe('shoppingSettingListRequestSchema', () => {
  it('화면이 보내는 요청을 통과시킨다', () => {
    const body = { filters: { ...FILTERS, mallCode: 'KAKAOS', mallAccountId: 'sa_1234' }, page: 2, pageSize: 10 };
    expect(shoppingSettingListRequestSchema.parse(body)).toEqual(body);
  });

  it('필터 코드가 틀리면 거절한다', () => {
    const result = shoppingSettingListRequestSchema.safeParse({ filters: { ...FILTERS, dateType: 'deletedAt' } });
    expect(result.error?.issues[0]?.message).toBe(INVALID_FILTER_MESSAGE);
  });
});

describe('mallAddressBookRequestSchema', () => {
  it('계정과 주소 종류를 받는다', () => {
    expect(mallAddressBookRequestSchema.safeParse({ mallAccountId: 'sa_1', addressType: 'RETURN' }).success).toBe(true);
  });

  it('주소 종류가 틀리면 기존 문구로 거절한다', () => {
    const result = mallAddressBookRequestSchema.safeParse({ mallAccountId: 'sa_1', addressType: 'HOME' });
    expect(result.error?.issues[0]?.message).toBe('주소 종류가 올바르지 않습니다.');
  });

  it('계정이 비면 거절한다', () => {
    const result = mallAddressBookRequestSchema.safeParse({ mallAccountId: '', addressType: 'SHIPPING' });
    expect(result.error?.issues[0]?.message).toBe('쇼핑몰 계정을 선택해주세요.');
  });
});
