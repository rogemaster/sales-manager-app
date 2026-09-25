import { FilterOption } from '@/types/common.type';

export type DeliveryTypeId = 'FREE' | 'NOT_FREE' | 'CHARGE_RECEIVED' | 'CONDITIONAL_FREE';

export const DELIVERY_TYPE_OPTION: FilterOption[] = [
  {
    id: 'FREE',
    name: '무료배송',
  },
  {
    id: 'NOT_FREE',
    name: '유료배송',
  },
  {
    id: 'CHARGE_RECEIVED',
    name: '착불',
  },
  {
    id: 'CONDITIONAL_FREE',
    name: '조건부 무료배송',
  },
] as const;

/**
 * 배송비를 받는 배송 방식인가 — 상품 폼과 연동상품 일괄수정이 배송비 입력칸을 켜고 끄는 기준이다.
 * (착불은 수령자가 택배사에 내므로 판매자가 배송비를 적지 않는다.)
 */
export const isPaidDelivery = (deliveryType: string | undefined): boolean =>
  deliveryType === 'NOT_FREE' || deliveryType === 'CONDITIONAL_FREE';

export const DELIVERY_COMPANY: FilterOption[] = [
  { id: 'CJ', name: '대한통운' },
  { id: 'HANJIN', name: '한진택배' },
  { id: 'LOTTE', name: '롯데택배' },
  { id: 'EPOST', name: '우체국택배' },
  { id: 'LOGEN', name: '로젠택배' },
];
