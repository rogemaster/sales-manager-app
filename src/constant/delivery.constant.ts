import { FilterOption } from '../types/common.type';

// 배송 타입 옵션
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
