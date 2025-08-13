import { MOCK_PRODUCT_DATA } from '@/mock/TestProducts';
import { atom } from 'jotai';

export const itemsPageAtom = atom<number>(10);

export const currentPageAtom = atom<number>(1);

const mockTotalPages = Math.ceil(MOCK_PRODUCT_DATA.length / 10);

export const totalPagesAtom = atom<number>(mockTotalPages);
