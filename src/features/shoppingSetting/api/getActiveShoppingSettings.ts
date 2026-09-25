import { ActiveShoppingSettingOption } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getActiveShoppingSettings = async (): Promise<ActiveShoppingSettingOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/active`, { method: 'POST' });
  await throwIfNotOk(response, '활성 쇼핑몰 설정 조회 실패');
  return response.json();
};
