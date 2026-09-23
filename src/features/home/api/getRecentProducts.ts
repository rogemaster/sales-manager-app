import { RecentProduct } from '../types/home.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getRecentProducts = async (ownerId: string): Promise<RecentProduct[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/home/recent-products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });

  throwIfUnauthorized(response);
  if (!response.ok) {
    throw new Error('최근 상품 조회 실패');
  }

  return response.json();
};
