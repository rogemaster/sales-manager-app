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

export const DELIVERY_COMPANY: FilterOption[] = [
  { id: 'CJ', name: '대한통운' },
  { id: 'HANJIN', name: '한진택배' },
  { id: 'LOTTE', name: '롯데택배' },
  { id: 'EPOST', name: '우체국택배' },
  { id: 'LOGEN', name: '로젠택배' },
];
