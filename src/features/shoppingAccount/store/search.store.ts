import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingAccountSearchType } from '../types/shoppingAccount.types';
import { createFilterGroup } from '@/shared/utils/filterGroup';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 shoppingAccount).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

export const currentPageAtom = filters.atom<number>(1);
export const selectedAccountsAtom = atom<string[]>([]);

export const accountDateTypeAtom = filters.atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const accountStartDateAtom = filters.atom<string>(DEFAULT_START_DATE);
export const accountEndDateAtom = filters.atom<string>(DEFAULT_END_DATE);
export const accountIsActiveAtom = filters.atom<'true' | 'false' | 'ALL'>('ALL');
export const accountMallCodeAtom = filters.atom<string>('ALL');

export const getAccountSearchFilterAtom = atom<ShoppingAccountSearchType>((get) => ({
  dateType: get(accountDateTypeAtom),
  startDate: get(accountStartDateAtom),
  endDate: get(accountEndDateAtom),
  isActive: get(accountIsActiveAtom),
  mallCode: get(accountMallCodeAtom) as ShoppingAccountSearchType['mallCode'],
  searchValue: '', // 검색어는 입력칸이 들고 있다가 검색 버튼에서 committed에 넣는다
}));

export const committedFiltersAtom = filters.atom<ShoppingAccountSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  isActive: 'ALL',
  mallCode: 'ALL',
  searchValue: '',
});
