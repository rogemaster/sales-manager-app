import { FilterOption } from '@/types/common.type';

export const ORIGIN_COUNTRIES: FilterOption[] = [
  { id: 'KR', name: '대한민국' },
  { id: 'CN', name: '중국' },
  { id: 'VN', name: '베트남' },
  { id: 'US', name: '미국' },
  { id: 'JP', name: '일본' },
  { id: 'IT', name: '이탈리아' },
  { id: 'FR', name: '프랑스' },
  { id: 'DE', name: '독일' },
  { id: 'GB', name: '영국' },
  { id: 'TH', name: '태국' },
  { id: 'ID', name: '인도네시아' },
  { id: 'IN', name: '인도' },
  { id: 'ETC', name: '기타' },
];

export const TAX_TYPE_OPTIONS: FilterOption[] = [
  { id: 'TAXABLE', name: '과세' },
  { id: 'TAX_FREE', name: '면세' },
  { id: 'ZERO_RATED', name: '영세' },
];

export const ADULT_PRODUCT_OPTIONS: FilterOption[] = [
  { id: 'GENERAL', name: '일반상품' },
  { id: 'ADULT', name: '성인상품' },
];
