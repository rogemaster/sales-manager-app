import { describe, expect, it } from 'vitest';
import { PRODUCT_BULK_MAX_ROWS } from '@/features/products/constant/bulk.constant';
import {
  CUSTOMER_CODE_MAX_LENGTH,
  findCustomerCodeInputProblem,
  findDuplicateCustomerCodeGroups,
  findFirstRepeatedCustomerCodeIndex,
  formatCustomerCodeDuplicateMessage,
  formatCustomerCodeInRequestMessage,
  matchExistingCustomerCodes,
  normalizeCustomerCode,
  readCustomerCodeCheckRequest,
  toCustomerCodeKey,
} from './customerCode';

describe('normalizeCustomerCode', () => {
  it('앞뒤 공백만 지우고 대소문자는 그대로 둔다', () => {
    expect(normalizeCustomerCode('  Cs-001 ')).toBe('Cs-001');
  });

  it('빈 문자열·공백만 있는 값은 null', () => {
    expect(normalizeCustomerCode('')).toBeNull();
    expect(normalizeCustomerCode('   ')).toBeNull();
  });

  it('null·undefined는 null', () => {
    expect(normalizeCustomerCode(null)).toBeNull();
    expect(normalizeCustomerCode(undefined)).toBeNull();
  });

  it('엑셀 숫자 셀은 문자열로 바꾼다', () => {
    expect(normalizeCustomerCode(1001)).toBe('1001');
  });

  it('유한하지 않은 숫자·그 외 타입은 null', () => {
    expect(normalizeCustomerCode(Number.NaN)).toBeNull();
    expect(normalizeCustomerCode(true)).toBeNull();
    expect(normalizeCustomerCode({})).toBeNull();
  });
});

describe('findCustomerCodeInputProblem', () => {
  it('값 없음·문자열·유한한 숫자는 문제없다', () => {
    expect(findCustomerCodeInputProblem(undefined)).toBeNull();
    expect(findCustomerCodeInputProblem(null)).toBeNull();
    expect(findCustomerCodeInputProblem('')).toBeNull();
    expect(findCustomerCodeInputProblem('CS-001')).toBeNull();
    expect(findCustomerCodeInputProblem(1001)).toBeNull();
  });

  it('불리언·객체·배열·유한하지 않은 숫자는 TYPE — 정규화가 조용히 null로 바꿔 코드가 사라지던 값이다', () => {
    expect(findCustomerCodeInputProblem(true)).toBe('TYPE');
    expect(findCustomerCodeInputProblem(false)).toBe('TYPE');
    expect(findCustomerCodeInputProblem({})).toBe('TYPE');
    expect(findCustomerCodeInputProblem(['A'])).toBe('TYPE');
    expect(findCustomerCodeInputProblem(Number.NaN)).toBe('TYPE');
  });

  it(`앞뒤 공백을 지운 길이가 ${CUSTOMER_CODE_MAX_LENGTH}자를 넘으면 LENGTH`, () => {
    const max = 'A'.repeat(CUSTOMER_CODE_MAX_LENGTH);
    expect(findCustomerCodeInputProblem(` ${max} `)).toBeNull();
    expect(findCustomerCodeInputProblem(`${max}A`)).toBe('LENGTH');
  });
});

describe('toCustomerCodeKey', () => {
  it('소문자로 바꾼다', () => {
    expect(toCustomerCodeKey('CS-001')).toBe('cs-001');
  });
});

describe('findDuplicateCustomerCodeGroups', () => {
  it('대소문자만 다른 값을 한 묶음으로 보고 묶음의 모든 index를 돌려준다', () => {
    expect(findDuplicateCustomerCodeGroups(['CS-001', 'A', 'cs-001', 'CS-001'])).toEqual([[0, 2, 3]]);
  });

  it('null은 무시한다', () => {
    expect(findDuplicateCustomerCodeGroups([null, null, 'A'])).toEqual([]);
  });

  it('중복이 없으면 빈 배열', () => {
    expect(findDuplicateCustomerCodeGroups(['A', 'B'])).toEqual([]);
  });
});

describe('findFirstRepeatedCustomerCodeIndex', () => {
  it('앞에서 이미 나온 키를 가진 첫 index를 돌려준다', () => {
    expect(findFirstRepeatedCustomerCodeIndex(['A', 'B', 'b', 'a'])).toBe(2);
  });

  it('null끼리는 반복으로 보지 않는다', () => {
    expect(findFirstRepeatedCustomerCodeIndex([null, 'A', null])).toBe(-1);
  });
});

describe('matchExistingCustomerCodes', () => {
  it('키가 같은 기존 코드의 실제 표기를 짝지어 돌려준다', () => {
    expect(matchExistingCustomerCodes(['cs-001', 'B'], [{ key: 'cs-001', existingCode: 'CS-001' }])).toEqual([
      { code: 'cs-001', existingCode: 'CS-001' },
    ]);
  });
});

describe('readCustomerCodeCheckRequest', () => {
  it('정규화하고 빈 값을 버리며 키가 같은 값은 처음 것만 남긴다', () => {
    expect(readCustomerCodeCheckRequest({ codes: [' CS-001 ', '', 'cs-001', 'B'], excludeProductId: 'P1' })).toEqual({
      codes: ['CS-001', 'B'],
      excludeProductId: 'P1',
    });
  });

  it('excludeProductId가 없으면 키 자체를 넣지 않는다', () => {
    expect(readCustomerCodeCheckRequest({ codes: ['A'] })).toEqual({ codes: ['A'] });
  });

  it('형식이 틀리면 null', () => {
    expect(readCustomerCodeCheckRequest(null)).toBeNull();
    expect(readCustomerCodeCheckRequest({ codes: 'A' })).toBeNull();
    expect(readCustomerCodeCheckRequest({ codes: [1] })).toBeNull();
    expect(readCustomerCodeCheckRequest({ codes: ['A'], excludeProductId: 3 })).toBeNull();
  });

  it(`정규화한 코드가 ${CUSTOMER_CODE_MAX_LENGTH}자를 넘으면 null`, () => {
    expect(readCustomerCodeCheckRequest({ codes: [` ${'A'.repeat(CUSTOMER_CODE_MAX_LENGTH)} `] })).not.toBeNull();
    expect(readCustomerCodeCheckRequest({ codes: ['A'.repeat(CUSTOMER_CODE_MAX_LENGTH + 1)] })).toBeNull();
  });

  it(`개수가 ${PRODUCT_BULK_MAX_ROWS}를 넘으면 null`, () => {
    const codes = Array.from({ length: PRODUCT_BULK_MAX_ROWS + 1 }, (_, i) => `C-${i}`);
    expect(readCustomerCodeCheckRequest({ codes })).toBeNull();
  });
});

describe('문구', () => {
  it('표기가 같으면 괄호를 붙이지 않는다', () => {
    expect(formatCustomerCodeDuplicateMessage('CS-001', 'CS-001')).toBe('이미 등록된 고객사 상품코드입니다: CS-001');
  });

  it('표기가 다르면 등록된 코드를 함께 보여준다', () => {
    expect(formatCustomerCodeDuplicateMessage('cs-001', 'CS-001')).toBe(
      '이미 등록된 고객사 상품코드입니다: cs-001 (등록된 코드: CS-001)',
    );
  });

  it('요청 안 중복 문구', () => {
    expect(formatCustomerCodeInRequestMessage('CS-001')).toBe('요청 안에서 고객사 상품코드가 중복됩니다: CS-001');
  });
});
