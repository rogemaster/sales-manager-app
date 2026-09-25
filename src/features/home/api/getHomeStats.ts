import { HomeStats } from '../types/home.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getHomeStats = async (startDate: string, endDate: string): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  });

  await throwIfNotOk(response, '홈 통계 조회 실패');

  return response.json();
};
