import { ProductSaleState } from '@/types/ProductInterface';

// 전체 상품상태 옵션 상수
export const ALL_PRODUCT_STATUS_OPTION = {
  id: 'ALL',
  name: '전체',
};

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

// 일자 필터
export const PRODUCT_DATE_TYPE = [
  {
    id: 'register',
    name: '등록일',
  },
  {
    id: 'update',
    name: '수정일',
  },
] as const;

// 배송 타입 옵션
export const DELIVERY_TYPE_OPTION = [
  {
    type: 'FREE',
    name: '무료배송',
  },
  {
    type: 'NOT_FREE',
    name: '유료배송',
  },
  {
    type: 'CHARGE_RECEIVED',
    name: '착불',
  },
  {
    type: 'CONDITIONAL_FREE',
    name: '조건부 무료배송',
  },
] as const;
