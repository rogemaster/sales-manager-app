import { throwIfNotOk } from '@/shared/utils/apiResponse';
import { RunCollectionBody, RunCollectionResponse } from '../types/collection.types';

export async function runOrderCollection(body: RunCollectionBody): Promise<RunCollectionResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/collection/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, '주문수집 실행 실패');
  return response.json();
}
