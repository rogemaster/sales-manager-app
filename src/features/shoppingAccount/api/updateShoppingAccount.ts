import { ShoppingAccount, UpdateShoppingAccountBody } from '../types/shoppingAccount.types';

// ownerId 인자는 시그니처에 남기되 요청에서 뺀다. 소유권 판정은 서버 세션이 한다.
export const updateShoppingAccount = async (
  id: string,
  body: UpdateShoppingAccountBody,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ownerId: string,
): Promise<ShoppingAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/accounts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 수정 실패');
  return response.json();
};
