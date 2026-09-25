import { ShoppingSetting, CreateShoppingSettingBody } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const createShoppingSetting = async (body: CreateShoppingSettingBody): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response, '쇼핑몰 정보설정 등록 실패');
  return response.json();
};
