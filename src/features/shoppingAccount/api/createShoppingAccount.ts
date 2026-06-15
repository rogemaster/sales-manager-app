import { ShoppingAccount, CreateShoppingAccountBody } from '../types/shoppingAccount.types';

export const createShoppingAccount = async (
  body: CreateShoppingAccountBody,
  ownerId: string,
): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ownerId }),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 등록 실패');
  return response.json();
};
