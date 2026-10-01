import { OrderComment } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const createOrderComment = async (orderId: string, content: string): Promise<OrderComment> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  await throwIfNotOk(response, '코멘트 저장 실패');
  return response.json();
};
