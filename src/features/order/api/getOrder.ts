import { OrderDetail } from '../types/order.types';

export const getOrder = async (orderId: string, ownerId: string): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('주문 조회 실패');
  return response.json();
};
