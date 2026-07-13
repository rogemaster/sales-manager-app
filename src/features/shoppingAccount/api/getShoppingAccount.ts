import { ShoppingAccount } from '../types/shoppingAccount.types';

export const getShoppingAccount = async (id: string, ownerId: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 조회 실패');
  return response.json();
};
