import { User } from '@/features/auth/types/Auth';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export type UpdateProfileBody = {
  name: string;
  phone: string;
  company?: string;
  bio?: string;
};

export const updateProfile = async (body: UpdateProfileBody): Promise<User> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('프로필 저장에 실패했습니다.');
  return response.json();
};
