// src/features/order/api/triggerOrderCollection.ts
import { TriggerCollectionBody } from '../types/collection.types';

export async function triggerOrderCollection(
  jobIds: string[],
  ownerId: string,
): Promise<{ success: boolean; triggeredCount: number }> {
  const body: TriggerCollectionBody = { jobIds };
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('주문수집 실행 실패');
  return response.json();
}
