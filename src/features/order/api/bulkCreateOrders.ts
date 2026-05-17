import { Order } from '../types/order.types';

export const bulkCreateOrders = async (data: Order[]) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('주문 대량 등록 실패');

  return response.json() as Promise<{ success: boolean; count: number }>;
};
