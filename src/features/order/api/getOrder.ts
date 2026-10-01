import { Order } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getOrder = async (orderId: string): Promise<Order> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`);
  await throwIfNotOk(response, '주문 조회 실패');
  return response.json();
};
