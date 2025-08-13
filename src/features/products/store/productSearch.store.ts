import { atom } from 'jotai';
import { ProductSearch } from '@/features/products/type/Product';

// 기본값 상수
const DEFAULT_DATE_TYPE: string = 'register';
const DEFAULT_PRODUCT_STATUS: string = 'ALL';
const DEFAULT_CATEGORY_CODE: string = 'all';

/**
 * 상품 검색 필터 Atom
 */
export const DateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);

export const registDateAtom = atom<Date>(new Date());

export const updateDateAtom = atom<Date | null>(null);

export const saleTypeAtom = atom<string>(DEFAULT_PRODUCT_STATUS);

export const categoryAtom = atom<string>(DEFAULT_CATEGORY_CODE);

export const searchValueAtom = atom<string>('');

/**
 * 상품 검색 필터 데이터
 */
export const getSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(DateTypeAtom),
  registDate: get(registDateAtom),
  updateDate: get(updateDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchValue: get(searchValueAtom),
}));
