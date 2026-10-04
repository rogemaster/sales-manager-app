import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingSettingSearchType } from '../types/shoppingSetting.types';
import { createFilterGroup } from '@/shared/utils/filterGroup';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

// 메뉴를 벗어나면 이 묶음 전체를 초기화한다(SearchFilterScopeReset, 범위: filterScope.constant.ts의 shoppingSetting).
const filters = createFilterGroup();
export const resetFilterAtom = filters.resetAtom;

export const currentPageAtom = filters.atom<number>(1);
export const selectedSettingsAtom = atom<string[]>([]);

export const settingDateTypeAtom = filters.atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const settingStartDateAtom = filters.atom<string>(DEFAULT_START_DATE);
export const settingEndDateAtom = filters.atom<string>(DEFAULT_END_DATE);
export const settingMallCodeAtom = filters.atom<string>('ALL');
export const settingMallAccountIdAtom = filters.atom<string>('ALL');

export const getSettingSearchFilterAtom = atom<ShoppingSettingSearchType>((get) => ({
  dateType: get(settingDateTypeAtom),
  startDate: get(settingStartDateAtom),
  endDate: get(settingEndDateAtom),
  mallCode: get(settingMallCodeAtom) as ShoppingSettingSearchType['mallCode'],
  mallAccountId: get(settingMallAccountIdAtom),
  searchValue: '', // 검색어는 입력칸이 들고 있다가 검색 버튼에서 committed에 넣는다
}));

export const committedFiltersAtom = filters.atom<ShoppingSettingSearchType>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallAccountId: 'ALL',
  searchValue: '',
});

// 계정등록쇼핑몰 변경 시 쇼핑몰아이디 선택값을 함께 초기화하기 위한 쓰기 전용 atom
export const setSettingMallCodeAtom = atom(null, (_, set, mallCode: string) => {
  set(settingMallCodeAtom, mallCode);
  set(settingMallAccountIdAtom, 'ALL');
});

// 신규추가 모달 오픈 상태
export const isNewSettingModalOpenAtom = atom<boolean>(false);
