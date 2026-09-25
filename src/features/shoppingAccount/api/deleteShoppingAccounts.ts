import { BulkAccountResult } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const deleteShoppingAccounts = async (ids: string[]): Promise<BulkAccountResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await throwIfNotOk(response, '쇼핑몰 계정 삭제 실패');
  return response.json();
};
