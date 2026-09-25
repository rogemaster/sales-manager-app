import { ShoppingAccount, CreateShoppingAccountBody } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const createShoppingAccount = async (body: CreateShoppingAccountBody): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, '쇼핑몰 계정 등록 실패');
  return response.json();
};
