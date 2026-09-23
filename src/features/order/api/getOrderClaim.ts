import { OrderClaim } from '../types/order.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getOrderClaim = async (orderId: string, ownerId: string): Promise<OrderClaim | null> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/claim`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('클레임 조회 실패');
  return response.json();
};
