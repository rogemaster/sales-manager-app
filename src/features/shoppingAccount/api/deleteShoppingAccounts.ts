import { BulkAccountResult } from '../types/shoppingAccount.types';

// ownerId 인자는 시그니처에 남기되 요청에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const deleteShoppingAccounts = async (ids: string[], _ownerId: string): Promise<BulkAccountResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 삭제 실패');
  return response.json();
};
