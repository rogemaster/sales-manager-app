import { describe, expect, it } from 'vitest';
import { productExcelSaveStrategy } from './productExcelSaveStrategy';
import { ExcelRowWithErrors } from '@/types/excel.type';

const baseRow: ExcelRowWithErrors = {
  상품명: '테스트 상품',
  카테고리: 'CAT-001',
  판매가: 10000,
  판매상태: 'ON_SALE',
  배송정책: '무료배송',
  배송비: 0,
  메인이미지: 'https://example.com/main.png',
  상세설명: '<p>상세</p>',
  총수량: 10,
};

describe('productExcelSaveStrategy - 브랜드 및 모델 정보', () => {
  it('브랜드·제조업체·모델명·모델번호를 도메인 필드로 매핑한다', () => {
    const [product] = productExcelSaveStrategy([
      { ...baseRow, 브랜드: '테스트브랜드', 제조업체: '테스트제조사', 모델명: 'MD-0001', 모델번호: 'A0001' },
    ]);

    expect(product.brand).toBe('테스트브랜드');
    expect(product.manufacturer).toBe('테스트제조사');
    expect(product.modelName).toBe('MD-0001');
    expect(product.modelId).toBe('A0001');
  });

  it('시트에서 숫자로 파싱된 모델번호도 문자열로 저장한다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 브랜드: 'B', 제조업체: 'M', 모델번호: 10000001 }]);

    expect(product.modelId).toBe('10000001');
  });

  it('선택 항목인 모델명·모델번호가 비어 있으면 undefined로 둔다', () => {
    const [product] = productExcelSaveStrategy([{ ...baseRow, 브랜드: 'B', 제조업체: 'M', 모델명: '', 모델번호: '' }]);

    expect(product.modelName).toBeUndefined();
    expect(product.modelId).toBeUndefined();
  });
});
