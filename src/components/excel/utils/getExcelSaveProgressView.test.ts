import { describe, expect, it } from 'vitest';
import { getExcelSaveProgressView } from './getExcelSaveProgressView';

describe('getExcelSaveProgressView', () => {
  it('진행률 알림 전에는 준비 단계이고 숫자를 보여주지 않는다', () => {
    expect(getExcelSaveProgressView(null)).toEqual({ label: '저장 준비 중...', count: null, value: 0 });
  });

  it('이미지를 가져오는 중이면 건수와 비율을 보여준다', () => {
    expect(getExcelSaveProgressView({ done: 12, total: 50 })).toEqual({
      label: '이미지 저장 중',
      count: '12 / 50',
      value: 24,
    });
  });

  it('시작 알림(0, total)도 이미지 단계다', () => {
    expect(getExcelSaveProgressView({ done: 0, total: 3 })).toEqual({
      label: '이미지 저장 중',
      count: '0 / 3',
      value: 0,
    });
  });

  it('이미지를 다 가져오면 상품 정보 저장 단계로 넘어간다', () => {
    expect(getExcelSaveProgressView({ done: 50, total: 50 })).toEqual({
      label: '상품 정보 저장 중...',
      count: '50 / 50',
      value: 100,
    });
  });

  it('가져올 이미지가 없으면 0으로 나누지 않고 상품 정보 저장 단계로 본다', () => {
    expect(getExcelSaveProgressView({ done: 0, total: 0 })).toEqual({
      label: '상품 정보 저장 중...',
      count: null,
      value: 100,
    });
  });
});
