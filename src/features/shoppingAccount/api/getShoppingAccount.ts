import { ShoppingAccount } from '../types/shoppingAccount.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getShoppingAccount = async (id: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`);
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 계정 조회 실패');
  return response.json();
};
