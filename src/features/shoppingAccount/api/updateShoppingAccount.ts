import { ShoppingAccount, UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

export const updateShoppingAccount = async (
  id: string,
  body: UpdateShoppingAccountBody,
  ownerId: string,
): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 수정 실패');
  return response.json();
};
