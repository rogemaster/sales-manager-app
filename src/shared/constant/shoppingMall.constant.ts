import { FilterOption, ShoppingMallType } from '@/types/common.type';

/** 쇼핑몰 목록의 단일 정본. ShoppingMalls 유니온 타입도 여기서 파생한다(common.type.ts) — 몰 추가는 이 배열 한 곳만 고친다. */
export const SHOPPING_MALLS = [
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
] as const satisfies readonly ShoppingMallType[];

/** 쇼핑몰 코드 목록 — 계정 폼과 서버 쓰기 검증이 허용값으로 쓴다. */
export const SHOPPING_MALL_CODES: readonly string[] = SHOPPING_MALLS.map((mall) => mall.code);

/** 쇼핑몰 목록을 필터 Select 옵션(`FilterOption`) 형태로 변환한 것 — 도메인별로 같은 map을 반복하지 않도록 여기서 한 번만 만든다. */
export const SHOPPING_MALL_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({
  id: mall.code,
  name: mall.name,
}));
