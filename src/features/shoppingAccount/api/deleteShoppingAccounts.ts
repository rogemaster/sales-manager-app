import { BulkAccountResult } from '../types/shoppingAccount.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const deleteShoppingAccounts = async (ids: string[]): Promise<BulkAccountResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
  return response.json();
};
