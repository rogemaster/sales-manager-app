import { FilterOption, ShoppingMallType } from '@/types/common.type';

export const SHOPPING_MALLS: ShoppingMallType[] = [
  { code: 'AUC', name: '옥션' },
  { code: 'GMK', name: '지마켓' },
  { code: '11ST', name: '11번가' },
  { code: 'INTP', name: '인터파크' },
  { code: 'NSST', name: '스마트스토어' },
  { code: 'COUP', name: '쿠팡' },
  { code: 'CJH', name: 'CJ홈쇼핑' },
  { code: 'GSH', name: 'GS홈쇼핑' },
  { code: 'LOTH', name: '롯데홈쇼핑' },
  { code: 'SSGC', name: 'SSG' },
  { code: 'HDH', name: '현대홈쇼핑' },
  { code: 'OHOU', name: '오늘의집' },
  { code: 'HALF', name: '하프클럽' },
  { code: 'MUSIN', name: '무신사스토어' },
  { code: 'KAKAOS', name: '카카오스토어' },
  { code: 'MUST', name: '머스트잇' },
];

/** 쇼핑몰 목록을 필터 Select 옵션(`FilterOption`) 형태로 변환한 것 — 도메인별로 같은 map을 반복하지 않도록 여기서 한 번만 만든다. */
export const SHOPPING_MALL_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({
  id: mall.code,
  name: mall.name,
}));
