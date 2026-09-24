import { HomeStats } from '../types/home.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getHomeStats = async (startDate: string, endDate: string): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  });

  throwIfUnauthorized(response);
  if (!response.ok) {
    throw new Error('홈 통계 조회 실패');
  }

  return response.json();
};
