// src/features/order/api/triggerOrderCollection.ts
import { TriggerCollectionBody } from '../types/collection.types';

export async function triggerOrderCollection(jobIds: string[]): Promise<{ success: boolean; triggeredCount: number }> {
  const body: TriggerCollectionBody = { jobIds };
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('주문수집 실행 실패');
  return response.json();
}
