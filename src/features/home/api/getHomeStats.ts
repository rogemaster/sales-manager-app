import { HomeStats } from '../types/home.types';

export const getHomeStats = async (ownerId: string): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });

  if (!response.ok) {
    throw new Error('홈 통계 조회 실패');
  }

  return response.json();
};
