import { ActiveShoppingSettingOption } from '../types/shoppingSetting.types';

export const getActiveShoppingSettings = async (ownerId: string): Promise<ActiveShoppingSettingOption[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!response.ok) throw new Error('활성 쇼핑몰 설정 조회 실패');
  return response.json();
};
