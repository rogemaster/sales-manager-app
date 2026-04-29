import { RecentProduct } from '../types/home.types';

export const getRecentProducts = async (): Promise<RecentProduct[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/recent-products`);

  if (!response.ok) {
    throw new Error('최근 상품 조회 실패');
  }

  return response.json();
};
