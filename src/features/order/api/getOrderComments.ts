import { OrderComment } from '../types/order.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getOrderComments = async (orderId: string, ownerId: string): Promise<OrderComment[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('코멘트 조회 실패');
  return response.json();
};
