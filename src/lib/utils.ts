import { MOCK_CATEGORY_DATA } from '@/mock/TestCategorys';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCategoryName(code: string) {
  return MOCK_CATEGORY_DATA.find((value) => code.includes(value.code))?.name;
}
