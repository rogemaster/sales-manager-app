import { BulkAccountResult } from '../types/shoppingAccount.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

// ownerId 인자는 시그니처에 남기되 요청에서 뺀다. 소유권 판정은 서버 세션이 한다.
export const updateShoppingAccountsStatus = async (
  ids: string[],
  isActive: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ownerId: string,
): Promise<BulkAccountResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('사용여부 변경 실패');
  return response.json();
};
