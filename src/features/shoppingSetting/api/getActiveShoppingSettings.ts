import { ActiveShoppingSettingOption } from '../types/shoppingSetting.types';
import { throwIfUnauthorized } from '@/shared/utils/unauthorized';

export const getActiveShoppingSettings = async (): Promise<ActiveShoppingSettingOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/active`, { method: 'POST' });
  throwIfUnauthorized(response);
  if (!response.ok) throw new Error('활성 쇼핑몰 설정 조회 실패');
  return response.json();
};
