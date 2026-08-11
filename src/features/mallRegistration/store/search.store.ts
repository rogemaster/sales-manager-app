import { atom } from 'jotai';
import dayjs from 'dayjs';
import { ProductSearch, ProductSearchType } from '@/features/products/types/product.types';

/**
 * 쇼핑몰 상품등록 화면 전용 검색 필터.
 *
 * 상품목록(`/products/list`)과 필터 구성이 같지만 store를 공유하지 않는다.
 * 공유하면 상품목록에서 건 필터가 이 화면으로 따라오는데, 둘은 별개 화면이므로 그건 버그다.
 * 조회 결과 타입(`ProductSearch`)만 같은 엔드포인트를 쓰기 때문에 공유한다.
 */

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

/**
 * UI 조작 중인 draft 필터. 검색 버튼을 눌러야 화면의 조회 조건으로 확정된다.
 */
export const getMallRegistrationSearchFilterAtom = atom<ProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  saleType: get(saleTypeAtom),
  categoryId: get(categoryAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));
