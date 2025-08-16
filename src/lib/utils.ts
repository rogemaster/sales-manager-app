import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { MOCK_CATEGORY_DATA } from '@/mock/MockCategoryData';
import dayjs from 'dayjs';
import { RangeTypeProps } from '@/types/CommonInterface';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCategoryName(id: string) {
  return MOCK_CATEGORY_DATA.find((value) => id.includes(value.id))?.name;
}

// 페이지네이션 계산
export function getPage(range: number, currentPage: number, totalPages: number) {
  const maxRange = range || 10;

  if (range > totalPages) {
    return [1];
  }

  const currentBlock = Math.floor((currentPage - 1) / maxRange);
  const startPage = currentBlock * maxRange + 1;
  const endPage = Math.min(startPage + maxRange - 1, totalPages);
  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
}

// range에 따른 날짜 계산
export function calculatorRangeDate(value: RangeTypeProps) {
  const startDate = dayjs().subtract(value.range, value.uniq).toDate();
  const endDate = new Date();

  return [startDate, endDate];
}
