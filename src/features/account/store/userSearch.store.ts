import dayjs from 'dayjs';
import { atom } from 'jotai';
import { UserGrade } from '@/features/auth/types/Auth';
import { UserSearchType } from '../types/user.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedUsersAtom = atom<string[]>([]);

export const userDateTypeAtom = atom<string>(DEFAULT_DATE_TYPE);
export const userStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const userEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const userGradeAtom = atom<UserGrade | 'ALL'>('ALL');
export const userSearchTypeAtom = atom<string>('email');
export const userSearchValueAtom = atom<string>('');

// UI draft 상태 — 검색 버튼 클릭 전까지 API 호출에 사용되지 않음
export const getUserSearchFilterAtom = atom<UserSearchType>((get) => ({
  dateType: get(userDateTypeAtom),
  startDate: get(userStartDateAtom),
  endDate: get(userEndDateAtom),
  grade: get(userGradeAtom),
  searchType: get(userSearchTypeAtom),
  searchValue: get(userSearchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 — API 쿼리에 실제로 사용
export const committedFiltersAtom = atom<UserSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  grade: 'ALL',
  searchType: 'email',
  searchValue: '',
});
