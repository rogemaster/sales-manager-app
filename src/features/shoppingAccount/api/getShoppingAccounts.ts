import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '../types/shoppingAccount.types';

export const getShoppingAccounts = async (
  ownerId: string,
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingAccountsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
