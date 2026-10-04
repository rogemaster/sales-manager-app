// src/features/order/store/collect.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { CollectionAccountFilters, CollectionSearchKey } from '../types/collection.types';
import { ShoppingMalls } from '@/types/common.type';
import { createFilterGroup } from '@/shared/utils/filterGroup';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 orderCollect).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

/** 수집 기간. 검색 버튼이 아니라 주문수집 버튼이 이 값(화면에 보이는 값)을 쓴다. */
export const collectStartDateAtom = filters.atom<string>(DEFAULT_START_DATE);
export const collectEndDateAtom = filters.atom<string>(DEFAULT_END_DATE);
export const collectMallAtom = filters.atom<ShoppingMalls | 'ALL'>('ALL');
export const collectMallIdAtom = filters.atom<string>('ALL');
export const selectedAccountIdsAtom = atom<string[]>([]);

export const collectSearchTypeAtom = filters.atom<CollectionSearchKey>('collectedBy');

/** 검색 버튼으로 확정한 계정 필터(쇼핑몰·아이디·검색어). */
export const collectFiltersAtom = filters.atom<CollectionAccountFilters>({
  mallCode: 'ALL',
  mallId: 'ALL',
  searchType: 'collectedBy',
  searchValue: '',
});
