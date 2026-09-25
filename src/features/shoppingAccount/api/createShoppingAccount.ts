import { ShoppingAccount, CreateShoppingAccountBody } from '../types/shoppingAccount.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const createShoppingAccount = async (body: CreateShoppingAccountBody): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 계정 등록 실패');
  return response.json();
};
