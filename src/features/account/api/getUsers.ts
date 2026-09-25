import { GetUsersResponse, UserSearchType } from '../types/user.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getUsers = async (
  filters: UserSearchType,
  page: number,
  pageSize: number = 10, // 다른 목록 화면과 같은 기본값
): Promise<GetUsersResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  await throwIfNotOk(response, '사용자 목록 조회 실패');
  return response.json();
};
