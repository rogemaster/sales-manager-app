import { FilterOption, TableTitleValue } from '@/types/common.type';
import { SHOPPING_MALLS } from '@/shared/constant/shoppingMall.constant';

export const SETTING_DATE_TYPE: FilterOption[] = [
  { id: 'createdAt', name: '등록일' },
  { id: 'updatedAt', name: '수정일' },
];

export const SETTING_STATUS_OPTIONS: FilterOption[] = [
  { id: 'true', name: '사용중' },
  { id: 'false', name: '사용안함' },
];

export const SETTING_MALL_NAME_OPTIONS: FilterOption[] = SHOPPING_MALLS.map((mall) => ({
  id: mall.code,
  name: mall.name,
}));

export const ALL_SETTING_MALL_NAME: FilterOption = { id: 'ALL', name: '전체' };

export const SHOPPING_SETTING_TABLE_HEAD: TableTitleValue[] = [
  { id: 'mallCode', title: '쇼핑몰' },
  { id: 'mallId', title: '아이디' },
  { id: 'nickname', title: '별칭' },
  { id: 'isActive', title: '사용여부' },
  { id: 'createdAt', title: '등록일' },
  { id: 'updatedAt', title: '수정일' },
];

export const PRODUCT_CONDITION_OPTIONS: FilterOption[] = [
  { id: 'NEW', name: '신상품' },
  { id: 'USED', name: '중고상품' },
];

export const SALES_PERIOD_OPTIONS: FilterOption[] = [
  { id: '7', name: '7일' },
  { id: '15', name: '15일' },
  { id: '30', name: '30일' },
  { id: '60', name: '60일' },
  { id: '90', name: '90일' },
];
