import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingAccountSearchType } from '../types/shoppingAccount.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedAccountsAtom = atom<string[]>([]);

export const accountDateTypeAtom = atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const accountStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const accountEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const accountIsActiveAtom = atom<'true' | 'false' | 'ALL'>('ALL');
export const accountMallCodeAtom = atom<string>('ALL');
export const accountSearchValueAtom = atom<string>('');

export const getAccountSearchFilterAtom = atom<ShoppingAccountSearchType>((get) => ({
  dateType: get(accountDateTypeAtom),
  startDate: get(accountStartDateAtom),
  endDate: get(accountEndDateAtom),
  isActive: get(accountIsActiveAtom),
  mallCode: get(accountMallCodeAtom) as ShoppingAccountSearchType['mallCode'],
  searchValue: get(accountSearchValueAtom),
}));

export const committedFiltersAtom = atom<ShoppingAccountSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  isActive: 'ALL',
  mallCode: 'ALL',
  searchValue: '',
});
