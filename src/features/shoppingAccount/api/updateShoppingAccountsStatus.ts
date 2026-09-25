import { BulkAccountResult } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const updateShoppingAccountsStatus = async (ids: string[], isActive: boolean): Promise<BulkAccountResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  await throwIfNotOk(response, '사용여부 변경 실패');
  return response.json();
};
