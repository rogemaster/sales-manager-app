import { AccountUser, CreateUserBody } from '../types/user.types';

export const createUser = async (ownerId: string, body: CreateUserBody): Promise<AccountUser> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, ...body }),
  });
  if (!response.ok) throw new Error('사용자 등록에 실패했습니다.');
  return response.json();
};
