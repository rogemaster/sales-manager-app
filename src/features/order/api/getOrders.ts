import { PaginationMeta } from '@/types/common.type';
import { Order, OrderSearchType } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export interface GetOrdersResponse extends PaginationMeta {
  orders: Order[];
}

export const getOrders = async (filters: OrderSearchType, page: number, pageSize: number = 20) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });

  await throwIfNotOk(response, '주문 목록 조회 실패');

  return response.json() as Promise<GetOrdersResponse>;
};
