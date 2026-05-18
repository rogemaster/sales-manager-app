import { OrderEditHistory } from '../types/order.types';

export const getOrderHistory = async (orderId: string): Promise<OrderEditHistory[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/history`);
  if (!response.ok) throw new Error('수정이력 조회 실패');
  return response.json();
};
