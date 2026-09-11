import { describe, expect, it } from 'vitest';
import { findInvalidProductCode, invalidProductCodeMessage } from './productCodes';

describe('findInvalidProductCode', () => {
  it('상수 목록의 코드값이면 위반이 없다', () => {
    expect(findInvalidProductCode({ state: 'ON_SALE', deliveryType: 'FREE' })).toBeNull();
  });

  it('판매상태가 코드가 아닌 표시명이면 위반으로 잡는다', () => {
    expect(findInvalidProductCode({ state: '판매중' as never })).toEqual({ label: '판매상태', value: '판매중' });
  });

  it('배송정책이 목록 밖의 값이면 위반으로 잡는다', () => {
    expect(findInvalidProductCode({ deliveryType: '무료' })).toEqual({ label: '배송정책', value: '무료' });
  });

  it('둘 다 잘못됐으면 먼저 선언된 판매상태를 돌려준다', () => {
    expect(findInvalidProductCode({ state: '판매중' as never, deliveryType: '무료' })).toEqual({
      label: '판매상태',
      value: '판매중',
    });
  });

  it('요청에 없는 필드는 검사하지 않는다 — 부분 수정(PATCH)이 다른 필드만 보낼 수 있다', () => {
    expect(findInvalidProductCode({ name: '이름만 바꾼다' })).toBeNull();
  });

  it('빈 문자열은 코드가 아니므로 거부한다', () => {
    expect(findInvalidProductCode({ deliveryType: '' })).toEqual({ label: '배송정책', value: '' });
  });
});

describe('invalidProductCodeMessage', () => {
  it('어떤 필드의 어떤 값이 문제인지 알려준다', () => {
    expect(invalidProductCodeMessage({ label: '판매상태', value: '판매중' })).toBe(
      "판매상태에 사용할 수 없는 값입니다: '판매중'",
    );
  });

  it('행 번호를 주면 몇 번째 행인지 앞에 붙인다 — 대량등록은 어느 행인지 알아야 고칠 수 있다', () => {
    expect(invalidProductCodeMessage({ label: '배송정책', value: '무료' }, 3)).toBe(
      "3번째 행의 배송정책에 사용할 수 없는 값입니다: '무료'",
    );
  });
});
