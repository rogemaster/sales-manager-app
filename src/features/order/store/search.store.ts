import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';

const DEFAULT_DATE_TYPE = 'orderCollectionDate';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_ORDER_STATUS = 'ALL';
const DEFAULT_SEARCH_TYPE = 'orderName';

export const currentPageAtom = atom<number>(1);

export const dateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const shoppingMallAtom = atom<string>('ALL');
export const mallAccountIdAtom = atom<string>('ALL');
export const deliveryCompanyAtom = atom<string>('ALL');
export const orderStatusAtom = atom<string>(DEFAULT_ORDER_STATUS);
export const searchTypeAtom = atom<string>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

export const selectedOrdersAtom = atom<string[]>([]);

// UI 조작 중인 draft 필터 (검색 버튼 클릭 전까지 API 호출에 사용되지 않음)
export const getOrderSearchFilterAtom = atom<OrderSearchType>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  shoppingMall: get(shoppingMallAtom),
  mallAccountId: get(mallAccountIdAtom),
  deliveryCompany: get(deliveryCompanyAtom),
  orderStatus: get(orderStatusAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFiltersAtom = atom<OrderSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  shoppingMall: 'ALL',
  mallAccountId: 'ALL',
  deliveryCompany: 'ALL',
  orderStatus: DEFAULT_ORDER_STATUS,
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
