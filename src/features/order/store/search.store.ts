import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';

const DEFAULT_DATE_TYPE = 'orderCollectionDate';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_ORDER_STATUS = 'ALL';
const DEFAULT_SEARCH_TYPE = 'orderName';

export const dateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const shoppingMallAtom = atom<string>('ALL');
export const mallAccountIdAtom = atom<string>('ALL');
export const deliveryCompanyAtom = atom<string>('ALL');
export const orderStatusAtom = atom<string>(DEFAULT_ORDER_STATUS);
export const searchTypeAtom = atom<string>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

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
