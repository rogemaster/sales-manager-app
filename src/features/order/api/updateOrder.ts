import { OrderDetail } from '../types/order.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const updateOrder = async (
  orderId: string,
  data: Partial<OrderDetail>,
  ownerId: string,
): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(data),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('주문 수정 실패');
  return response.json();
};
