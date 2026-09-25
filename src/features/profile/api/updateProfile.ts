import { User } from '@/features/auth/types/Auth';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';
import { ProfileEditFormData } from '../util/profileEditSchema';

// 본문 타입은 서버(PATCH /api/profile)가 검증하는 스키마에서 파생한다 — 폼·api·route가 같은 타입을 본다.
export const updateProfile = async (body: ProfileEditFormData): Promise<User> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('프로필 저장에 실패했습니다.');
  return response.json();
};
