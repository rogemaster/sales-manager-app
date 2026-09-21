import { describe, it, expect } from 'vitest';
import { sanitizeMallSettings } from './sanitizeMallSettings';

describe('sanitizeMallSettings', () => {
  it('네이버 키만 남기고 나머지는 버린다', () => {
    const result = sanitizeMallSettings('NSST', {
      afterServiceContact: '02-1234-5678',
      certs: '카카오 전용 키',
      존재하지않는키: 'x',
    });
    expect(result).toEqual({ afterServiceContact: '02-1234-5678' });
  });

  it('카카오 키만 남긴다', () => {
    const result = sanitizeMallSettings('KAKAOS', {
      certs: '인증정보',
      afterServiceGuide: '네이버 전용 키',
    });
    expect(result).toEqual({ certs: '인증정보' });
  });

  it('불리언 값을 보존한다', () => {
    expect(sanitizeMallSettings('NSST', { purchaseReviewExposure: false })).toEqual({
      purchaseReviewExposure: false,
    });
  });

  it('NSST·KAKAOS 외의 몰은 항상 null이다', () => {
    expect(sanitizeMallSettings('COUP', { afterServiceContact: '02-1234-5678' })).toBeNull();
  });

  it('값이 없거나 객체가 아니면 null이다', () => {
    expect(sanitizeMallSettings('NSST', undefined)).toBeNull();
    expect(sanitizeMallSettings('NSST', null)).toBeNull();
    expect(sanitizeMallSettings('NSST', '문자열')).toBeNull();
    expect(sanitizeMallSettings('NSST', [])).toBeNull();
  });

  it('남은 키가 하나도 없으면 null이다', () => {
    expect(sanitizeMallSettings('NSST', { certs: '카카오 키' })).toBeNull();
  });

  it('빈 문자열은 값 없음으로 보고 버린다', () => {
    expect(sanitizeMallSettings('NSST', { afterServiceContact: '', afterServiceGuide: '안내' })).toEqual({
      afterServiceGuide: '안내',
    });
  });

  it('타입이 맞지 않는 값은 버린다', () => {
    expect(sanitizeMallSettings('NSST', { afterServiceContact: 12345, purchaseReviewExposure: 'yes' })).toBeNull();
  });

  it('길이 상한을 넘는 문자열은 버린다', () => {
    expect(sanitizeMallSettings('NSST', { afterServiceGuide: 'a'.repeat(1001) })).toBeNull();
  });
});
