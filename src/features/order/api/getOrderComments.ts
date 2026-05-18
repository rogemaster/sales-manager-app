import { OrderComment } from '../types/order.types';

export const getOrderComments = async (orderId: string): Promise<OrderComment[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`);
  if (!response.ok) throw new Error('코멘트 조회 실패');
  return response.json();
};
