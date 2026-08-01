import { FilterOption, TableTitleValue } from '@/types/common.type';

export const ALL_FILTER_OPTION: FilterOption = { id: 'ALL', name: '전체' };

export const MALL_LINKED_PRODUCT_TABLE_HEAD: TableTitleValue[] = [
  { id: 'productCode', title: '상품코드', width: 'w-32' },
  { id: 'productName', title: '상품명' },
  { id: 'mallCode', title: '연동몰', width: 'w-28' },
  { id: 'settingNickname', title: '쇼핑몰계정', width: 'w-32' },
  { id: 'externalProductId', title: '쇼핑몰상품코드', width: 'w-40' },
  { id: 'price', title: '판매가', width: 'w-28' },
  { id: 'saleState', title: '판매상태', width: 'w-24' },
  { id: 'linkStatus', title: '연동상태', width: 'w-44' },
  { id: 'lastSentAt', title: '최종연동일시', width: 'w-36' },
];

export const MALL_LINKED_DATE_TYPE: FilterOption[] = [
  { id: 'lastSentAt', name: '최종연동일' },
  { id: 'updatedAt', name: '수정일' },
];

export const MALL_LINK_STATUS_OPTIONS: FilterOption[] = [
  { id: 'success', name: '성공' },
  { id: 'failed', name: '실패' },
];

export const MALL_LINKED_SEARCH_TYPE: FilterOption[] = [
  { id: 'productName', name: '상품명' },
  { id: 'productCode', name: '상품코드' },
  { id: 'externalProductCode', name: '쇼핑몰상품코드' },
  { id: 'createdBy', name: '등록자' },
  { id: 'updatedBy', name: '수정자' },
];
