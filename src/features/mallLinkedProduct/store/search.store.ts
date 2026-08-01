import dayjs from 'dayjs';
import { atom } from 'jotai';
import { MallLinkedProductSearch, MallLinkedProductSearchType, MallLinkStatus } from '../types/mallLinkedProduct.types';
import { ProductStateType } from '@/features/products/types/product.types';
import { ShoppingMalls } from '@/types/common.type';

const DEFAULT_DATE_TYPE: MallLinkedProductSearch['dateType'] = 'lastSentAt';
const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');
const DEFAULT_SEARCH_TYPE: MallLinkedProductSearchType = 'productName';

export const currentPageAtom = atom<number>(1);

export const dateTypeAtom = atom<MallLinkedProductSearch['dateType']>(DEFAULT_DATE_TYPE);
export const startDateAtom = atom<string>(DEFAULT_START_DATE);
export const endDateAtom = atom<string>(DEFAULT_END_DATE);
export const mallCodeAtom = atom<ShoppingMalls | 'ALL'>('ALL');
export const shoppingSettingIdAtom = atom<string>('ALL');
export const linkStatusAtom = atom<MallLinkStatus | 'ALL'>('ALL');
export const saleStateAtom = atom<ProductStateType | 'ALL'>('ALL');
export const searchTypeAtom = atom<MallLinkedProductSearchType>(DEFAULT_SEARCH_TYPE);
export const searchValueAtom = atom<string>('');

// UI 조작 중인 draft 필터 (검색 버튼 클릭 전까지 API 호출에 사용되지 않음)
export const draftFilterAtom = atom<MallLinkedProductSearch>((get) => ({
  dateType: get(dateTypeAtom),
  startDate: get(startDateAtom),
  endDate: get(endDateAtom),
  mallCode: get(mallCodeAtom),
  shoppingSettingId: get(shoppingSettingIdAtom),
  linkStatus: get(linkStatusAtom),
  saleState: get(saleStateAtom),
  searchType: get(searchTypeAtom),
  searchValue: get(searchValueAtom),
}));

// 검색 버튼 클릭 시 확정된 필터 (API 쿼리에 실제로 사용)
export const committedFilterAtom = atom<MallLinkedProductSearch>({
  dateType: DEFAULT_DATE_TYPE,
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  shoppingSettingId: 'ALL',
  linkStatus: 'ALL',
  saleState: 'ALL',
  searchType: DEFAULT_SEARCH_TYPE,
  searchValue: '',
});
