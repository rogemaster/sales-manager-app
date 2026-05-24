// src/features/order/api/getCollectionJobs.ts
import { CollectionJob, CollectionSearchParams } from '../types/collection.types';

export async function getCollectionJobs(params: CollectionSearchParams): Promise<CollectionJob[]> {
  const query = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    mallCode: params.mallCode,
    mallAccountId: params.mallAccountId,
  });
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/order/collection/jobs?${query}`);
  if (!response.ok) throw new Error('수집 작업 목록 조회 실패');
  return response.json();
}
