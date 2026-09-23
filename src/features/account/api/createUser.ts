import { AccountUser, CreateUserBody } from '../types/user.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const createUser = async (body: CreateUserBody): Promise<AccountUser> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // 서버가 거절 사유를 담아 보낸다. 고정 문구로 덮지 않는다.
  throwIfUnauthorized(response);
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({ error: '' }));
    throw new Error(error || '사용자 등록에 실패했습니다.');
  }
  return response.json();
};
