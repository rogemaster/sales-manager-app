import dayjs from 'dayjs';
import { atom } from 'jotai';
import { ShoppingSettingSearchType } from '../types/shoppingSetting.types';

const DEFAULT_DATE_TYPE = 'createdAt' as const;
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const currentPageAtom = atom<number>(1);
export const selectedSettingsAtom = atom<string[]>([]);

export const settingDateTypeAtom = atom<'createdAt' | 'updatedAt'>(DEFAULT_DATE_TYPE);
export const settingStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const settingEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const settingMallCodeAtom = atom<string>('ALL');
export const settingMallAccountIdAtom = atom<string>('ALL');
export const settingSearchValueAtom = atom<string>('');

export const getSettingSearchFilterAtom = atom<ShoppingSettingSearchType>((get) => ({
  dateType: get(settingDateTypeAtom),
  startDate: get(settingStartDateAtom),
  endDate: get(settingEndDateAtom),
  mallCode: get(settingMallCodeAtom) as ShoppingSettingSearchType['mallCode'],
  mallAccountId: get(settingMallAccountIdAtom),
  searchValue: get(settingSearchValueAtom),
}));

export const committedFiltersAtom = atom<ShoppingSettingSearchType>({
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
