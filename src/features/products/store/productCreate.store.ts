import { atom } from 'jotai';

/**
 * 상품 기본정보 Atom
 */
export const productName = atom<string>('');

export const customerProductCode = atom<string>('');

export const keyword = atom<string[]>([]);

export const category = atom<string>('');

/**
 * 상품 가격 및 수량정보 Atom
 */
export const netPrice = atom<number>(0);

export const price = atom<number>(0);

export const totalQuantity = atom<number>(0);

export const deliveryType = atom<string>('');

export const deliveryPrice = atom<number>(0);

/**
 * 상품 옵션정보 Atom
 */
