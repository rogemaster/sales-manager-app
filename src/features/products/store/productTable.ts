import { mockProducts } from '@/mock/TestProducts';
import { atom } from 'jotai';

export const itemsPageAtom = atom<number>(10);

export const currentPageAtom = atom<number>(1);

const mockTotalPages = Math.ceil(mockProducts.length / 10);

export const totalPagesAtom = atom<number>(mockTotalPages);
