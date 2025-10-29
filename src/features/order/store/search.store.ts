import dayjs from 'dayjs';
import { atom } from 'jotai';
import { OrderSearchType } from '../types/order.types';

// 필터 기본 상수값
const DEFAULT_DATE_TYPE: string = 'register';
const DEFAULT_DATE: Date[] = [dayjs().subtract(7, 'day').toDate(), new Date()];
const DEFAULT_ORDER_STATUS: string = 'ALL';

/**
 * 주문 검색 필터 Atom
 */
export const DateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);

export const searchDateAtom = atom<Date[]>(DEFAULT_DATE);

export const orderStatusAtom = atom<string>(DEFAULT_ORDER_STATUS);

export const searchValueAtom = atom<string>('');

/**
 * 주문 검색 필터 데이터
 */
export const getOrderSearchFilterAtom = atom<OrderSearchType>((get) => ({
  dateType: get(DateTypeAtom),
  searchDate: get(searchDateAtom),
  orderStatus: get(orderStatusAtom),
  searchValue: get(searchValueAtom),
}));
