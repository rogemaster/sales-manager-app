import { ShoppingSetting, UpdateShoppingSettingBody } from '../types/shoppingSetting.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const updateShoppingSetting = async (id: string, body: UpdateShoppingSettingBody): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('쇼핑몰 정보설정 수정 실패');
  return response.json();
};
