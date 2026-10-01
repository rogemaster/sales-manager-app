import { OrderClaim } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getOrderClaim = async (orderId: string): Promise<OrderClaim | null> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/claim`);
  await throwIfNotOk(response, '클레임 조회 실패');
  return response.json();
};
