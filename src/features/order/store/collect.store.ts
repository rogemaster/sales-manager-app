// src/features/order/store/collect.store.ts
import dayjs from 'dayjs';
import { atom } from 'jotai';
import { CollectionSearchParams } from '../types/collection.types';

const DEFAULT_START_DATE = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
const DEFAULT_END_DATE = dayjs().format('YYYY-MM-DD');

export const collectStartDateAtom = atom<string>(DEFAULT_START_DATE);
export const collectEndDateAtom = atom<string>(DEFAULT_END_DATE);
export const collectMallAtom = atom<string>('ALL');
export const collectMallAccountIdAtom = atom<string>('ALL');
export const selectedJobIdsAtom = atom<string[]>([]);

export const collectSearchParamsAtom = atom<CollectionSearchParams>({
  startDate: DEFAULT_START_DATE,
  endDate: DEFAULT_END_DATE,
  mallCode: 'ALL',
  mallAccountId: 'ALL',
});
