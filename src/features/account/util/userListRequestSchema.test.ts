import { describe, it, expect } from 'vitest';
import { userListRequestSchema } from './userListRequestSchema';

const VALID = {
  filters: {
    dateType: 'createdAt',
    startDate: '2026-09-01',
    endDate: '2026-09-24',
    grade: 'ALL',
    searchType: 'email',
    searchValue: '',
  },
  page: 1,
  pageSize: 20,
};

describe('userListRequestSchema', () => {
  it('유효한 요청을 통과시킨다', () => {
    expect(userListRequestSchema.safeParse(VALID).success).toBe(true);
  });

  // 페이지 값은 거절하지 않고 보정한다(규칙과 사례는 listRequest.test.ts).
  it('page·pageSize가 틀리면 기본값·상한으로 보정한다', () => {
    expect(userListRequestSchema.parse({ ...VALID, page: 0, pageSize: 101 })).toMatchObject({ page: 1, pageSize: 100 });
  });

  it('알 수 없는 등급·날짜기준·검색기준은 거부한다', () => {
    expect(userListRequestSchema.safeParse({ ...VALID, filters: { ...VALID.filters, grade: 'root' } }).success).toBe(
      false,
    );
    expect(
      userListRequestSchema.safeParse({ ...VALID, filters: { ...VALID.filters, dateType: 'deletedAt' } }).success,
    ).toBe(false);
    expect(
      userListRequestSchema.safeParse({ ...VALID, filters: { ...VALID.filters, searchType: 'phone' } }).success,
    ).toBe(false);
  });

  it('날짜가 YYYY-MM-DD가 아니면 거부한다', () => {
    expect(
      userListRequestSchema.safeParse({ ...VALID, filters: { ...VALID.filters, startDate: '2026/09/01' } }).success,
    ).toBe(false);
  });

  it('검색어가 100자를 넘으면 거부한다', () => {
    expect(
      userListRequestSchema.safeParse({ ...VALID, filters: { ...VALID.filters, searchValue: 'a'.repeat(101) } })
        .success,
    ).toBe(false);
  });

  it('filters가 없으면 거부한다 — 구조분해 500 대신 400', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filters: _, ...rest } = VALID;
    expect(userListRequestSchema.safeParse(rest).success).toBe(false);
  });
});
