import { FilterOption, TableTitleValue } from '@/types/common.type';

export const ACCOUNT_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const ACCOUNT_STATUS_OPTIONS: FilterOption[] = [
  { id: 'true', name: '사용' },
  { id: 'false', name: '미사용' },
];

export const ALL_ACCOUNT_STATUS: FilterOption = { id: 'ALL', name: '전체' };

export const MALL_NAME_OPTIONS: FilterOption[] = [
  { id: '쿠팡', name: '쿠팡' },
  { id: '네이버', name: '네이버' },
  { id: '11번가', name: '11번가' },
  { id: 'G마켓', name: 'G마켓' },
  { id: '옥션', name: '옥션' },
  { id: '위메프', name: '위메프' },
  { id: '티몬', name: '티몬' },
];

export const ALL_MALL_NAME: FilterOption = { id: 'ALL', name: '전체' };

export const SHOPPING_ACCOUNT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'mallName', title: '쇼핑몰명' },
  { id: 'nickname', title: '별명' },
  { id: 'isActive', title: '사용여부' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
