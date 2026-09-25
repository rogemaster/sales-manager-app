import { GetShoppingAccountsResponse, ShoppingAccountSearchType } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getShoppingAccounts = async (
  filters: ShoppingAccountSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingAccountsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  await throwIfNotOk(response, '쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
