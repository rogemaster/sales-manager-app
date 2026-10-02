import { BulkOrderStatusResult } from '../types/order.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

// 송장등록 주문을 쇼핑몰로 보낸다. 부분 실패는 오류가 아니라 결과(failures)로 온다.
export const sendOrderInvoices = async (orderNumbers: string[]): Promise<BulkOrderStatusResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/invoice/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: orderNumbers }),
  });
  await throwIfNotOk(response, '송장전송 실패');
  return response.json();
};
