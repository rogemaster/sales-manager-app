import { FilterOption, TableTitleValue } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

export const ACCOUNT_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const ACCOUNT_STATUS_OPTIONS: FilterOption[] = [
  { id: 'true', name: '사용' },
  { id: 'false', name: '미사용' },
];

export const ALL_ACCOUNT_STATUS: FilterOption = { id: 'ALL', name: '전체' };

export const MALL_NAME_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({
  id: mall.code,
  name: mall.name,
}));

export const ALL_MALL_NAME: FilterOption = { id: 'ALL', name: '전체' };

export const SHOPPING_ACCOUNT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'mallCode', title: '쇼핑몰명' },
  { id: 'nickname', title: '별명' },
  { id: 'isActive', title: '사용여부' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];
