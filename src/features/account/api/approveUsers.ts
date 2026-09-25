import { ApproveUsersResult } from '../types/user.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const approveUsers = async (ids: string[]): Promise<ApproveUsersResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  // 서버가 거절 사유(권한 없는 사용자 포함)를 담아 보낸다. 고정 문구로 덮지 않는다.
  await throwIfNotOk(response, '사용자 승인 실패');
  return response.json();
};
