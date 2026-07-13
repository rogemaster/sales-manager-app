import { ShoppingSetting, UpdateShoppingSettingBody } from '../types/shoppingSetting.types';

export const updateShoppingSetting = async (
  id: string,
  body: UpdateShoppingSettingBody,
  ownerId: string,
): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 수정 실패');
  return response.json();
};
