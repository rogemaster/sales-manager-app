import { OrderClaim } from '../types/order.types';

export const getOrderClaim = async (orderId: string): Promise<OrderClaim | null> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/claim`);
  if (!response.ok) throw new Error('클레임 조회 실패');
  return response.json();
};
