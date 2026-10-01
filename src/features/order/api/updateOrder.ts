import { Order } from '../types/order.types';
import { OrderWriteValues } from '../util/orderWrite';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const updateOrder = async (orderId: string, values: OrderWriteValues): Promise<Order> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  await throwIfNotOk(response, '주문 수정 실패');
  return response.json();
};
