import { atom } from 'jotai';
import { ProductSearch } from '@/features/products/types/ProductTypes';
import dayjs from 'dayjs';

// 기본값 상수
const DEFAULT_DATE_TYPE: string = 'register';
const DEFAULT_DATE: Date[] = [dayjs().subtract(7, 'day').toDate(), new Date()];
const DEFAULT_PRODUCT_STATUS: string = 'ALL';
const DEFAULT_CATEGORY_CODE: string = 'all';

/**
 * 상품 검색 필터 Atom
 */
export const DateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);

export const searchDateAtom = atom<Date[]>(DEFAULT_DATE);

export const saleTypeAtom = atom<string>(DEFAULT_PRODUCT_STATUS);

export const categoryAtom = atom<string>(DEFAULT_CATEGORY_CODE);

export const searchValueAtom = atom<string>('');

/**
 * 상품 검색 필터 데이터
 */
export const getSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(DateTypeAtom),
  searchDate: get(searchDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchValue: get(searchValueAtom),
}));
