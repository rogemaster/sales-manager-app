import { describe, it, expect } from 'vitest';
import { productListRequestSchema } from './productListRequestSchema';

const VALID = {
  dateType: 'register',
  startDate: '2026-09-01',
  endDate: '2026-09-26',
  saleType: 'ALL',
  categoryId: 'ALL',
  searchType: 'productName',
  searchValue: '',
  page: 2,
  pageSize: 10,
};

const parse = (body: unknown) => productListRequestSchema.safeParse(body);

describe('productListRequestSchema', () => {
  it('화면이 보내는 요청을 통과시킨다', () => {
    expect(parse(VALID).success).toBe(true);
    expect(parse({ ...VALID, dateType: 'update', saleType: 'ON_SALE', searchType: 'productCode' }).success).toBe(true);
  });

  it('페이지 값이 틀리면 거절하지 않고 보정한다(규칙은 listRequest.test.ts)', () => {
    expect(parse({ ...VALID, page: 0, pageSize: 5000 }).data).toMatchObject({ page: 1, pageSize: 100 });
  });

  it('날짜는 보정하지 않고 거절한다', () => {
    for (const startDate of ['2026/09/01', '2026-02-31', '', undefined]) {
      const result = parse({ ...VALID, startDate });
      expect(result.success).toBe(false);
    }
    expect(parse({ ...VALID, endDate: '2026-02-31' }).error?.issues[0]?.message).toBe('검색 기간이 올바르지 않습니다.');
  });

  it('목록에 없는 필터 코드를 거절한다', () => {
    expect(parse({ ...VALID, dateType: 'delete' }).success).toBe(false);
    expect(parse({ ...VALID, saleType: '판매중' }).success).toBe(false);
    expect(parse({ ...VALID, searchType: 'brand' }).success).toBe(false);
  });

  it('검색어·카테고리 길이 상한을 넘으면 거절한다', () => {
    expect(parse({ ...VALID, searchValue: 'a'.repeat(101) }).success).toBe(false);
    expect(parse({ ...VALID, categoryId: 'a'.repeat(101) }).success).toBe(false);
  });

  it('본문이 객체가 아니면 거절한다', () => {
    expect(parse(null).success).toBe(false);
    expect(parse([]).success).toBe(false);
  });
});
