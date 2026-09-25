import { HomeOrderStats } from '../types/home.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getHomeOrderStats = async (ownerId: string, startDate: string, endDate: string): Promise<HomeOrderStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/order-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, startDate, endDate }),
  });

  await throwIfNotOk(response, '주문/클레임 통계 조회 실패');

  return response.json();
};
