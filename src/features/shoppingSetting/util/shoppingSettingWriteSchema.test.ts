import { describe, it, expect } from 'vitest';
import { findShoppingSettingWriteViolation } from './shoppingSettingWriteSchema';

const ADDRESS = {
  code: 'COUP-WH-01',
  name: '본사 물류센터',
  zipCode: '08589',
  address: '서울특별시 금천구 가산디지털1로 168',
  addressDetail: '3층 301호',
};

const VALID = {
  mallAccountId: 'sa_001',
  nickname: '쿠팡 메인 설정',
  isActive: true,
  productCondition: 'NEW',
  salesPeriod: 30,
  shippingAddress: ADDRESS,
  returnAddress: ADDRESS,
};

describe('findShoppingSettingWriteViolation - create', () => {
  it('올바른 값이면 위반이 없다', () => {
    expect(findShoppingSettingWriteViolation(VALID)).toBeNull();
  });

  it('쇼핑몰계정이 비면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, mallAccountId: '' })).toBe('쇼핑몰 계정을 선택해주세요.');
  });

  it('별칭이 비면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, nickname: '   ' })).toBe('별칭을 입력해주세요.');
  });

  it('별칭 길이 상한을 넘으면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, nickname: 'a'.repeat(101) })).toBe(
      '별칭이 너무 깁니다.',
    );
  });

  it('상품상태 허용값이 아니면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, productCondition: 'BROKEN' })).toBe(
      '상품상태 값이 올바르지 않습니다.',
    );
  });

  it('판매기간 허용값이 아니면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, salesPeriod: 45 })).toBe(
      '판매기간 값이 올바르지 않습니다.',
    );
  });

  it('사용여부가 불리언이 아니면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, isActive: 'true' })).toBe(
      '사용여부 값이 올바르지 않습니다.',
    );
  });

  it('출고지가 없으면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, shippingAddress: null })).toBe('출고지를 선택해주세요.');
  });

  it('반품지가 없으면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, returnAddress: undefined })).toBe(
      '반품지를 선택해주세요.',
    );
  });

  it('주소 객체에 키가 빠지면 거부한다', () => {
    const broken = { ...ADDRESS, zipCode: undefined };
    expect(findShoppingSettingWriteViolation({ ...VALID, shippingAddress: broken })).toBe(
      '출고지 값이 올바르지 않습니다.',
    );
  });

  it('주소 코드가 비면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ ...VALID, returnAddress: { ...ADDRESS, code: '' } })).toBe(
      '반품지 값이 올바르지 않습니다.',
    );
  });
});

describe('findShoppingSettingWriteViolation - partial', () => {
  it('보낸 필드만 본다', () => {
    expect(findShoppingSettingWriteViolation({ nickname: '수정된 별칭' }, 'partial')).toBeNull();
  });

  it('보낸 필드가 틀리면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ salesPeriod: 45 }, 'partial')).toBe(
      '판매기간 값이 올바르지 않습니다.',
    );
  });

  it('빈 객체는 위반이 없다', () => {
    expect(findShoppingSettingWriteViolation({}, 'partial')).toBeNull();
  });

  // 선택 필드의 "값 없음"은 undefined가 아니라 null로 도착한다(absent-optional-value-arrives-as-null.md).
  // partial에서도 키가 있으면서 null이면 "지우겠다"는 뜻이므로 필수 필드는 거부해야 한다.
  it('키가 있는데 null이면 거부한다', () => {
    expect(findShoppingSettingWriteViolation({ shippingAddress: null }, 'partial')).toBe('출고지를 선택해주세요.');
    expect(findShoppingSettingWriteViolation({ nickname: null }, 'partial')).toBe('별칭을 입력해주세요.');
    expect(findShoppingSettingWriteViolation({ salesPeriod: null }, 'partial')).toBe(
      '판매기간 값이 올바르지 않습니다.',
    );
  });
});
