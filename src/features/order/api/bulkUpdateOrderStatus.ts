import { BulkOrderStatusResult, OrderStatusTypes } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

// 주문마다 PATCH를 N번 보내던 것을 한 요청으로. 부분 실패는 오류가 아니라 결과(failures)로 온다.
export const bulkUpdateOrderStatus = async (
  orderNumbers: string[],
  orderStatus: OrderStatusTypes,
): Promise<BulkOrderStatusResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: orderNumbers, orderStatus }),
  });
  await throwIfNotOk(response, '주문 상태 변경 실패');
  return response.json();
};
