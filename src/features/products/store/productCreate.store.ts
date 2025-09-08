import { atom } from 'jotai';

/**
 * 상품 등록 Atom
 */
export const productName = atom<string>('');

export const customerProductCode = atom<string>('');

export const keyword = atom<string[]>([]);

export const category = atom<string>('');
