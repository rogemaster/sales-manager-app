import dayjs from 'dayjs';
import { atom } from 'jotai';
import { UserGrade } from '@/features/auth/types/Auth';
import { UserSearchType } from '../types/user.types';
import { createFilterGroup } from '@/shared/utils/filterGroup';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 account).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

export const currentPageAtom = filters.atom<number>(1);
export const selectedUsersAtom = atom<string[]>([]);

export const userDateTypeAtom = filters.atom<UserSearchType['dateType']>(DEFAULT_DATE_TYPE);
export const userStartDateAtom = filters.atom<string>(DEFAULT_START_DATE);
export const userEndDateAtom = filters.atom<string>(DEFAULT_END_DATE);
export const userGradeAtom = filters.atom<UserGrade | 'ALL'>('ALL');
export const userSearchTypeAtom = filters.atom<UserSearchType['searchType']>('email');

// UI draft 상태 — 검색 버튼 클릭 전까지 API 호출에 사용되지 않음
export const getUserSearchFilterAtom = atom<UserSearchType>((get) => ({
  dateType: get(userDateTypeAtom),
  startDate: get(userStartDateAtom),
  endDate: get(userEndDateAtom),
  grade: get(userGradeAtom),
  searchType: get(userSearchTypeAtom),
  searchValue: '', // 검색어는 입력칸이 들고 있다가 검색 버튼에서 committed에 넣는다
}));

// 검색 버튼 클릭 시 확정된 필터 — API 쿼리에 실제로 사용
export const committedFiltersAtom = filters.atom<UserSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  grade: 'ALL',
  searchType: 'email',
  searchValue: '',
});
