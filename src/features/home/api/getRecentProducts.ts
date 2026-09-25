import { RecentProduct } from '../types/home.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getRecentProducts = async (): Promise<RecentProduct[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/recent-products`, { method: 'POST' });

  await throwIfNotOk(response, '최근 상품 조회 실패');

  return response.json();
};
