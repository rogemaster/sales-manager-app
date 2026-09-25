import { describe, it, expect } from 'vitest';
import { foldNaverError, MALL_NO_RESPONSE_MESSAGE } from './foldNaverError';
import { MALL_AUTH_FAILED_MESSAGE } from '@/features/shoppingAccount/util/accountMessages';

describe('foldNaverError', () => {
  it('필드 오류를 전부 이어 붙인다 (접두사 없이)', () => {
    const body = {
      code: 'BAD_REQUEST',
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [
        { name: 'name', type: 'LENGTH', message: '100자 이하여야 합니다.' },
        { name: 'deliveryInfo.deliveryCompany', type: 'REQUIRED', message: '필수 값입니다.' },
      ],
    };
    expect(foldNaverError(400, body)).toBe('상품명: 100자 이하여야 합니다. / 택배사가 없습니다.');
  });

  it('필드 오류가 없으면 메시지만', () => {
    expect(foldNaverError(400, { code: 'BAD_REQUEST', message: '이미 등록된 상품입니다.', invalidInputs: [] })).toBe(
      '이미 등록된 상품입니다.',
    );
  });

  it('이름이 빈 필드 오류는 메시지만 싣는다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [{ name: '', message: '요청 본문이 JSON이 아닙니다.' }],
    };
    expect(foldNaverError(400, body)).toBe('요청 본문이 JSON이 아닙니다.');
  });

  it('401은 계정 API Key 안내로 바꾼다', () => {
    expect(foldNaverError(401, { message: '인가되지 않은 요청입니다.', invalidInputs: [] })).toBe(
      MALL_AUTH_FAILED_MESSAGE,
    );
  });

  it('5xx는 응답 없음으로 본다', () => {
    expect(foldNaverError(500, { message: '내부 서버 오류가 발생했습니다.' })).toBe(MALL_NO_RESPONSE_MESSAGE);
  });

  it('모양이 다른 본문이면 응답 없음으로 본다', () => {
    expect(foldNaverError(400, 'not json')).toBe(MALL_NO_RESPONSE_MESSAGE);
  });

  it('REQUIRED — 받침 있는 라벨은 "이 없습니다"', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [{ name: 'name', type: 'REQUIRED', message: '필수 값입니다.' }],
    };
    expect(foldNaverError(400, body)).toBe('상품명이 없습니다.');
  });

  it('REQUIRED — 받침 없는 라벨은 "가 없습니다"', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [{ name: 'leafCategoryId', type: 'REQUIRED', message: '필수 값입니다.' }],
    };
    expect(foldNaverError(400, body)).toBe('카테고리가 없습니다.');
  });

  it('LENGTH는 라벨 뒤에 시뮬레이터 메시지를 그대로 붙인다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [{ name: 'name', type: 'LENGTH', message: '100자 이하여야 합니다.' }],
    };
    expect(foldNaverError(400, body)).toBe('상품명: 100자 이하여야 합니다.');
  });

  it('여러 필드 오류는 " / "로 이어 붙인다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [
        { name: 'name', type: 'REQUIRED', message: '필수 값입니다.' },
        { name: 'leafCategoryId', type: 'REQUIRED', message: '필수 값입니다.' },
      ],
    };
    expect(foldNaverError(400, body)).toBe('상품명이 없습니다. / 카테고리가 없습니다.');
  });

  it('매핑에 없는 필드명은 원래 이름을 그대로 라벨로 쓴다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [{ name: 'unknownField', type: 'TYPE', message: '문자열이어야 합니다.' }],
    };
    expect(foldNaverError(400, body)).toBe('unknownField: 문자열이어야 합니다.');
  });

  it('NOT_FOUND — shippingAddressId는 출고지 라벨로 바뀐다', () => {
    const body = {
      message: '요청 값이 올바르지 않습니다.',
      invalidInputs: [
        { name: 'deliveryInfo.shippingAddressId', type: 'NOT_FOUND', message: '주소록에 없는 출고지입니다.' },
      ],
    };
    expect(foldNaverError(400, body)).toBe('출고지: 주소록에 없는 출고지입니다.');
  });
});
