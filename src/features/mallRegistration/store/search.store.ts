import { atom } from 'jotai';
import dayjs from 'dayjs';
import { ProductSearch, ProductSearchType } from '@/features/products/types/product.types';

// 필터 기본 상수값
const DEFAULT_DATE_TYPE = 'register';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_PRODUCT_STATUS = 'ALL';
const DEFAULT_CATEGORY_CODE = 'ALL';
const DEFAULT_SEARCH_TYPE: ProductSearchType = 'productName';

export const dateTypeAtom = atom(DEFAULT_DATE_TYPE);

export const startDateAtom = atom(DEFAULT_START_DATE);

export const endDateAtom = atom(DEFAULT_END_DATE);

export const saleTypeAtom = atom(DEFAULT_PRODUCT_STATUS);

export const categoryAtom = atom(DEFAULT_CATEGORY_CODE);

export const searchTypeAtom = atom<ProductSearchType>(DEFAULT_SEARCH_TYPE);

export const searchValueAtom = atom('');

// UI 조작 중인 draft 필터
export const getMallRegistrationSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));
