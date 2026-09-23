import { ShoppingAccount } from '../types/shoppingAccount.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

// ownerId 인자는 시그니처에 남기되 요청에서 뺀다. 소유권 판정은 서버 세션이 한다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getShoppingAccount = async (id: string, _ownerId: string): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`);
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 계정 조회 실패');
  return response.json();
};
