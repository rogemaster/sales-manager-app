import { describe, expect, it } from 'vitest';
import { CUSTOMER_CODE_UNIQUE_INDEX, isCustomerCodeUniqueViolation } from './customerCodeUniqueViolation';

describe('isCustomerCodeUniqueViolation', () => {
  it('23505 + 고객사 상품코드 인덱스면 true', () => {
    expect(isCustomerCodeUniqueViolation({ code: '23505', constraint: CUSTOMER_CODE_UNIQUE_INDEX })).toBe(true);
  });

  it('drizzle이 cause로 감싼 원본 오류도 찾는다', () => {
    const wrapped = new Error('Failed query', { cause: { code: '23505', constraint: CUSTOMER_CODE_UNIQUE_INDEX } });
    expect(isCustomerCodeUniqueViolation(wrapped)).toBe(true);
  });

  it('다른 제약의 유니크 위반은 false', () => {
    expect(isCustomerCodeUniqueViolation({ code: '23505', constraint: 'products_pkey' })).toBe(false);
  });

  it('다른 오류 코드는 false', () => {
    expect(isCustomerCodeUniqueViolation({ code: '23502', constraint: CUSTOMER_CODE_UNIQUE_INDEX })).toBe(false);
  });

  it('null·문자열·undefined는 false', () => {
    expect(isCustomerCodeUniqueViolation(null)).toBe(false);
    expect(isCustomerCodeUniqueViolation('23505')).toBe(false);
    expect(isCustomerCodeUniqueViolation(undefined)).toBe(false);
  });
});
