import { atom } from 'jotai';
import { ProductSearch } from '@/features/products/type/Product';

// 카테고리 타입 정의
export type CategoryId = string;

// 기본값 상수
export const DEFAULT_CATEGORY_ID: CategoryId = 'all';

/**
 * 상품 검색 필터 Atom
 */
export const DateTypeAtom = atom<string>('register');

export const registDateAtom = atom<Date>(new Date());

export const updateDateAtom = atom<Date | null>(null);

export const saleTypeAtom = atom<string>('all');

// 카테고리 atom을 더 명확한 타입으로 정의
export const categoryAtom = atom<CategoryId>(DEFAULT_CATEGORY_ID);

export const searchValueAtom = atom<string>('');

/**
 * 상품 검색 필터 데이터
 */
export const getSearchFilterAtom = atom<ProductSearch>(get => ({
  dateType: get(DateTypeAtom),
  registDate: get(registDateAtom),
  updateDate: get(updateDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchValue: get(searchValueAtom),
}));