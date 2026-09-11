import { Product } from '@/features/products/types/product.types';
import { PRODUCT_STATUS } from '@/features/products/constant/status.constants';
import { DELIVERY_TYPE_OPTION } from '@/shared/constant/delivery.constant';

export type ProductCodeViolation = {
  label: string;
  value: string;
};

/**
 * 코드값만 허용되는 필드. 화면 Select·엑셀 양식이 쓰는 상수와 같은 목록을 본다.
 * 값 목록이 늘면 여기가 아니라 상수 쪽만 고치면 된다.
 */
const CODE_FIELDS = [
  { key: 'state', label: '판매상태', options: PRODUCT_STATUS },
  { key: 'deliveryType', label: '배송정책', options: DELIVERY_TYPE_OPTION },
] as const;

/**
 * 코드값이 아닌 값이 섞여 있으면 첫 번째 위반을 돌려준다. 없으면 null.
 *
 * 두 컬럼 모두 DB에서는 text라 어떤 문자열이든 저장된다. 저장을 막지 않으면 표시명이 그대로
 * 내려가 조회 시점에야 드러나므로, 들어오는 자리에서 거른다.
 * 요청에 없는 필드는 건너뛴다 — PATCH는 바꾸려는 필드만 보낸다.
 */
export const findInvalidProductCode = (product: Partial<Product>): ProductCodeViolation | null => {
  for (const { key, label, options } of CODE_FIELDS) {
    const value = product[key];
    if (value === undefined) continue;
    if (!options.some((option) => option.id === value)) return { label, value: String(value) };
  }

  return null;
};

export const invalidProductCodeMessage = ({ label, value }: ProductCodeViolation, row?: number): string => {
  const where = row === undefined ? label : `${row}번째 행의 ${label}`;
  return `${where}에 사용할 수 없는 값입니다: '${value}'`;
};
