import { atom } from 'jotai';
import { ProductSearch, ProductSearchType } from '@/features/products/types/product.types';
import dayjs from 'dayjs';
import { createFilterGroup } from '@/shared/utils/filterGroup';

// 필터 기본 상수값
const DEFAULT_DATE_TYPE = 'register';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_PRODUCT_STATUS = 'ALL';
const DEFAULT_CATEGORY_CODE = 'ALL';
const DEFAULT_SEARCH_TYPE: ProductSearchType = 'productName';

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 products).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

/**
 * 상품 검색 필터 Atom
 */
export const dateTypeAtom = filters.atom(DEFAULT_DATE_TYPE);

export const startDateAtom = filters.atom(DEFAULT_START_DATE);

export const endDateAtom = filters.atom(DEFAULT_END_DATE);

export const saleTypeAtom = filters.atom(DEFAULT_PRODUCT_STATUS);

export const categoryAtom = filters.atom(DEFAULT_CATEGORY_CODE);

export const searchTypeAtom = filters.atom<ProductSearchType>(DEFAULT_SEARCH_TYPE);

export const searchValueAtom = filters.atom('');

/**
 * 상품 검색 필터 데이터
 */
export const getSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

export const currentPageAtom = filters.atom<number>(1);

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFiltersAtom = filters.atom<ProductSearch>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  saleType: DEFAULT_PRODUCT_STATUS,
  categoryId: DEFAULT_CATEGORY_CODE,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
