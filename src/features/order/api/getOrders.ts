import { Order, OrderSearchType } from '../types/order.types';

export interface GetOrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getOrders = async (ownerId: string, filters: OrderSearchType, page: number, pageSize: number = 20) => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });

  if (!response.ok) throw new Error('주문 목록 조회 실패');

  return response.json() as Promise<GetOrdersResponse>;
};
