import { atom } from 'jotai';
import { ProductSearch } from '@/features/products/types/product.types';
import dayjs from 'dayjs';

// 필터 기본 상수값
const DEFAULT_DATE_TYPE = 'register';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_PRODUCT_STATUS = 'ALL';
const DEFAULT_CATEGORY_CODE = 'ALL';

/**
 * 상품 검색 필터 Atom
 */
export const dateTypeAtom = atom(DEFAULT_DATE_TYPE);

export const startDateAtom = atom(DEFAULT_START_DATE);

export const endDateAtom = atom(DEFAULT_END_DATE);

export const saleTypeAtom = atom(DEFAULT_PRODUCT_STATUS);

export const categoryAtom = atom(DEFAULT_CATEGORY_CODE);

export const searchValueAtom = atom('');

/**
 * 상품 검색 필터 데이터
 */
export const getSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchValue: get(searchValueAtom),
}));
