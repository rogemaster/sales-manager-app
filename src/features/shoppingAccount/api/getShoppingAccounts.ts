import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '../types/shoppingAccount.types';

// ownerId 인자는 시그니처에 남기되 요청에서 뺀다. 소유권 판정은 서버 세션이 한다.
export const getShoppingAccounts = async (
  _ownerId: string,
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingAccountsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
