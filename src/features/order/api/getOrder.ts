import { OrderDetail } from '../types/order.types';

export const getOrder = async (orderId: string): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`);
  if (!response.ok) throw new Error('주문 조회 실패');
  return response.json();
};
