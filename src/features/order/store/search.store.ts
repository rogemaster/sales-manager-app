import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';
import { ShoppingMalls } from '@/types/common.type';
import { createFilterGroup } from '@/shared/utils/filterGroup';

const DEFAULT_DATE_TYPE = 'orderCollectionDate';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_ORDER_STATUS = 'ALL';
const DEFAULT_SEARCH_TYPE = 'orderName';

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 order).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

export const currentPageAtom = filters.atom<number>(1);

export const dateTypeAtom = filters.atom<string>(DEFAULT_DATE_TYPE);
export const startDateAtom = filters.atom<string>(DEFAULT_START_DATE);
export const endDateAtom = filters.atom<string>(DEFAULT_END_DATE);
export const mallCodeAtom = filters.atom<ShoppingMalls | 'ALL'>('ALL');
export const mallIdAtom = filters.atom<string>('ALL');
export const deliveryCompanyAtom = filters.atom<string>('ALL');
export const orderStatusAtom = filters.atom<string>(DEFAULT_ORDER_STATUS);
export const searchTypeAtom = filters.atom<string>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = filters.atom<string>('');

export const selectedOrdersAtom = atom<string[]>([]);

// UI 조작 중인 draft 필터 (검색 버튼 클릭 전까지 API 호출에 사용되지 않음)
export const getOrderSearchFilterAtom = atom<OrderSearchType>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  mallCode: get(mallCodeAtom),
  mallId: get(mallIdAtom),
  deliveryCompany: get(deliveryCompanyAtom),
  orderStatus: get(orderStatusAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFiltersAtom = filters.atom<OrderSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: DEFAULT_ORDER_STATUS,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
