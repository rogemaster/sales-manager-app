import { MallAccountOption } from '../types/shoppingAccount.types';
import { ShoppingMalls } from '@/types/common.type';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getShoppingAccountsByMall = async (mallCode: ShoppingMalls): Promise<MallAccountOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/by-mall`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mallCode }),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
