import { HomeLinkedProductStats } from '../types/home.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getHomeLinkedProductStats = async (startDate: string, endDate: string): Promise<HomeLinkedProductStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/linked-product-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  });

  await throwIfNotOk(response, '연동상품 통계 조회 실패');

  return response.json();
};
