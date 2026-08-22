import { describe, expect, it } from 'vitest';
import { PRODUCT_BULK_EXCEL_TEMPLATE } from './bulkTemplate.constant';

describe('PRODUCT_BULK_EXCEL_TEMPLATE', () => {
  it('컬럼 24개를 정의된 순서대로 갖는다', () => {
    expect(PRODUCT_BULK_EXCEL_TEMPLATE.template.map((item) => item.name)).toEqual([
      '고객상품코드',
      '상품명',
      '카테고리',
      '브랜드',
      '제조업체',
      '모델명',
      '모델번호',
      '공급가',
      '판매가',
      '판매상태',
      '배송정책',
      '배송비',
      '메인이미지',
      '상세설명',
      '옵션명1',
      '옵션값1',
      '옵션명2',
      '옵션값2',
      '추가옵션명',
      '추가옵션값',
      '총수량',
      'SKU',
      '추가SKU',
      '키워드',
    ]);
  });

  // 서식은 Product 타입을 따른다 — number 필드만 숫자 서식이고 나머지는 전부 텍스트다.
  // 플래그를 빠뜨리면 텍스트로 떨어지는데, 그쪽이 값 변형이 없어 안전한 기본값이다.
  it('Product 타입이 number인 필드만 숫자 서식으로 표시한다', () => {
    const numericColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template.filter((item) => item.numeric).map((item) => item.name);

    expect(numericColumns).toEqual(['공급가', '판매가', '배송비', '총수량']);
  });

  it('숫자 서식이 아닌 컬럼은 전부 텍스트 서식이다', () => {
    const textColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template.filter((item) => !item.numeric).map((item) => item.name);

    expect(textColumns).toHaveLength(20);
    expect(textColumns).toContain('모델번호');
    expect(textColumns).toContain('고객상품코드');
    expect(textColumns).toContain('옵션값1');
    expect(textColumns).toContain('SKU');
  });

  it('필수 컬럼 목록이 바뀌지 않았다', () => {
    const requiredColumns = PRODUCT_BULK_EXCEL_TEMPLATE.template.filter((item) => item.req).map((item) => item.name);

    expect(requiredColumns).toEqual([
      '상품명',
      '브랜드',
      '제조업체',
      '판매가',
      '판매상태',
      '배송정책',
      '배송비',
      '메인이미지',
      '상세설명',
      '총수량',
    ]);
  });
});
