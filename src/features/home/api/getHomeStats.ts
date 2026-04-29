import { HomeStats } from '../types/home.types';

export const getHomeStats = async (): Promise<HomeStats> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/stats`);

  if (!response.ok) {
    throw new Error('홈 통계 조회 실패');
  }

  return response.json();
};
