import { GetUsersResponse, UserSearchType } from '../types/user.types';

export const getUsers = async (
  filters: UserSearchType,
  page: number,
  pageSize: number = 20,
): Promise<GetUsersResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/account/users/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('사용자 목록 조회 실패');
  return response.json();
};
