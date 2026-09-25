import { ShoppingAccount } from '../types/shoppingAccount.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getShoppingAccount = async (id: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`);
  await throwIfNotOk(response, '쇼핑몰 계정 조회 실패');
  return response.json();
};
