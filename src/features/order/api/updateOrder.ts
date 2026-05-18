import { OrderDetail } from '../types/order.types';

export const updateOrder = async (orderId: string, data: Partial<OrderDetail>): Promise<OrderDetail> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('주문 수정 실패');
  return response.json();
};
