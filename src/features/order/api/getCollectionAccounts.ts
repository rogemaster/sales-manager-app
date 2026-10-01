import { throwIfNotOk } from '@/shared/utils/apiResponse';
import { CollectionAccountFilters, CollectionAccountRow } from '../types/collection.types';

export async function getCollectionAccounts(filters: CollectionAccountFilters): Promise<CollectionAccountRow[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/orders/collection/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters }),
  });
  await throwIfNotOk(response, '수집 계정 목록 조회 실패');
  return response.json();
}
