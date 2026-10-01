import { OrderComment } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getOrderComments = async (orderId: string): Promise<OrderComment[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`);
  await throwIfNotOk(response, '코멘트 조회 실패');
  return response.json();
};
