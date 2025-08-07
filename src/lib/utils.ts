import { PRODUCT_STATUS } from '@/constant/Product';
import { mockCategorys } from '@/mock/TestCategorys';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function FindCategoryName(code: string) {
  return mockCategorys.find((value) => code.includes(value.code))?.name;
}

export function FindProductStatusName(id: string) {
  return PRODUCT_STATUS.find((value) => id.includes(value.id))?.name;
}
