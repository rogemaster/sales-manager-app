import { ProductSaleState } from '@/types/ProductInterface';

export const PRODUCT_SALE_TYPE: ProductSaleState[] = [
  {
    id: 'on-sale',
    name: '판매중',
  },
  {
    id: 'wait-sale',
    name: '판매대기',
  },
  {
    id: 'sold-out',
    name: '품절',
  },
  {
    id: 'sale-dis',
    name: '판매중지',
  },
];

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

// 배송 타입 상수 (타입 안전성 확보)
export const DELIVERY_TYPES = {
  FREE: 'FREE',
  NOT_FREE: 'NOT_FREE',
  CHARGE_RECEIVED: 'CHARGE_RECEIVED',
  CONDITIONAL_FREE: 'CONDITIONAL_FREE',
} as const;

// 배송 타입 값들의 유니온 타입
export type DeliveryTypeValue = (typeof DELIVERY_TYPES)[keyof typeof DELIVERY_TYPES];

// 배송 타입 객체 인터페이스
export interface DeliveryTypeOption {
  type: DeliveryTypeValue;
  name: string;
}

// 배송 타입 배열 (타입 안전성 확보)
export const DELIVERY_TYPE: readonly DeliveryTypeOption[] = [
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
