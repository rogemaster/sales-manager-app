import { ShoppingAccount, UpdateShoppingAccountBody } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const updateShoppingAccount = async (id: string, body: UpdateShoppingAccountBody): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, '쇼핑몰 계정 수정 실패');
  return response.json();
};
