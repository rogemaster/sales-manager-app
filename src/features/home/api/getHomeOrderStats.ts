import { HomeOrderStats } from '../types/home.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getHomeOrderStats = async (ownerId: string, startDate: string, endDate: string): Promise<HomeOrderStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/order-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, startDate, endDate }),
  });

  throwIfUnauthorized(response);
  if (!response.ok) {
    throw new Error('주문/클레임 통계 조회 실패');
  }

  return response.json();
};
