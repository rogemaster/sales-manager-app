import { ProductSaleState, ProductSearchType } from '@/features/products/types/product.types';
import { FilterOption } from '@/types/common.type';

// 상품 상태
export const PRODUCT_STATUS: ProductSaleState[] = [
  {
    id: 'ON_SALE',
    name: '판매중',
  },
  {
    id: 'WAIT_SALE',
    name: '판매대기',
  },
  {
    id: 'SOLD_OUT',
    name: '품절',
  },
  {
    id: 'SALE_DIS',
    name: '판매중지',
  },
];

// 검색어 타입 필터
export const PRODUCT_SEARCH_TYPE: FilterOption[] = [
  {
    id: 'productName',
    name: '상품명',
  },
  {
    id: 'productCode',
    name: '상품코드',
  },
];

/**
 * 검색어 앞뒤 공백을 제거한 뒤 호출할 검색 타입.
 * 코드값은 완전일치에 가깝게 매칭되므로 공백 하나에 결과가 통째로 사라진다.
 * ex) 'smp000001 ' 로 검색하면 'smp000001' 상품이 조회되지 않는다.
 */
export const TRIMMED_PRODUCT_SEARCH_TYPES: ProductSearchType[] = ['productCode'];

// 일자 필터
export const PRODUCT_DATE_TYPE: FilterOption[] = [
  {
    id: 'register',
    name: '등록일',
  },
  {
    id: 'update',
    name: '수정일',
  },
] as const;
