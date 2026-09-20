import { describe, it, expect } from 'vitest';
import { findShoppingAccountWriteViolation } from './shoppingAccountWriteSchema';
import type { CreateShoppingAccountBody } from '../types/shoppingAccount.types';

const valid: CreateShoppingAccountBody = {
  mallCode: 'NSST',
  mallId: 'naver_store_002',
  isActive: true,
  nickname: '네이버 스마트스토어',
  managerMd: '이담당',
  phone: '010-3333-4444',
  email: 'naver@example.com',
  domain: 'https://smartstore.naver.com/mystore',
  category: '가전',
  password: 'naver456!',
  apiKey: 'naver-sim-abc',
};

describe('findShoppingAccountWriteViolation - create', () => {
  it('정상 값은 위반이 없다', () => {
    expect(findShoppingAccountWriteViolation(valid)).toBeNull();
  });

  it('허용되지 않는 mallCode를 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, mallCode: 'XXXX' as never })).toBe(
      '유효하지 않은 쇼핑몰입니다.',
    );
  });

  it('mallId가 비면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, mallId: '   ' })).toBe('쇼핑몰 ID를 입력해주세요.');
  });

  it('managerMd가 비면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, managerMd: '' })).toBe('담당MD를 입력해주세요.');
  });

  it('category가 비면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, category: '' })).toBe('카테고리를 선택해주세요.');
  });

  it('password가 비면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, password: '' })).toBe('패스워드를 입력해주세요.');
  });

  it('apiKey가 비면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, apiKey: '' })).toBe('API Key를 입력해주세요.');
  });

  it('isActive가 boolean이 아니면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, isActive: 'true' as never })).toBe(
      '사용여부 값이 올바르지 않습니다.',
    );
  });

  // 하이픈은 PHONE_REGEX에서 선택이라 '01033334444'도 유효하다. 끝자리 수가 틀린 값으로 검사한다.
  it('연락처 형식이 틀리면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, phone: '010-1234-567' })).toBe(
      '올바른 연락처 형식을 입력해주세요. (예: 010-1234-5678)',
    );
  });

  it('연락처는 빈 값을 허용한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, phone: '' })).toBeNull();
  });

  it('이메일 형식이 틀리면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, email: 'naver@' })).toBe(
      '올바른 이메일 형식을 입력해주세요.',
    );
  });

  it('이메일은 빈 값을 허용한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, email: '' })).toBeNull();
  });

  // undefined는 drizzle이 .set()/.values()에서 빼주지만 null은 그대로 통과해 NOT NULL 위반(500)이 된다.
  it('nickname이 null이면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, nickname: null as never })).toBe(
      '별명 값이 올바르지 않습니다.',
    );
  });

  it('domain이 null이면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, domain: null as never })).toBe(
      '도메인 값이 올바르지 않습니다.',
    );
  });

  it('phone이 null이면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, phone: null as never })).toBe(
      '연락처 값이 올바르지 않습니다.',
    );
  });

  it('email이 null이면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ ...valid, email: null as never })).toBe(
      '이메일 값이 올바르지 않습니다.',
    );
  });
});

describe('findShoppingAccountWriteViolation - partial', () => {
  it('보내지 않은 필드는 검사하지 않는다', () => {
    expect(findShoppingAccountWriteViolation({ nickname: '수정' }, 'partial')).toBeNull();
  });

  it('보낸 필드가 빈 값이면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ mallId: '' }, 'partial')).toBe('쇼핑몰 ID를 입력해주세요.');
  });

  it('보낸 mallCode가 허용값이 아니면 거부한다', () => {
    expect(findShoppingAccountWriteViolation({ mallCode: 'XXXX' as never }, 'partial')).toBe(
      '유효하지 않은 쇼핑몰입니다.',
    );
  });
});
