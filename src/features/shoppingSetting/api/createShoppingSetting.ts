import { ShoppingSetting, CreateShoppingSettingBody } from '../types/shoppingSetting.types';

export const createShoppingSetting = async (
  body: CreateShoppingSettingBody,
  ownerId: string,
): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, ownerId }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 등록 실패');
  return response.json();
};
