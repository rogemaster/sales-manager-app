// src/features/order/store/collect.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { CollectionAccountFilters, CollectionSearchKey } from '../types/collection.types';
import { ShoppingMalls } from '@/types/common.type';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

/** 수집 기간. 검색 버튼이 아니라 주문수집 버튼이 이 값(화면에 보이는 값)을 쓴다. */
export const collectStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const collectEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const collectMallAtom = atom<ShoppingMalls | 'ALL'>('ALL');
export const collectMallIdAtom = atom<string>('ALL');
export const selectedAccountIdsAtom = atom<string[]>([]);

export const collectSearchTypeAtom = atom<CollectionSearchKey>('collectedBy');

/** 검색 버튼으로 확정한 계정 필터(쇼핑몰·아이디·검색어). */
export const collectFiltersAtom = atom<CollectionAccountFilters>({
  mallCode: 'ALL',
  mallId: 'ALL',
  searchType: 'collectedBy',
  searchValue: '',
});
