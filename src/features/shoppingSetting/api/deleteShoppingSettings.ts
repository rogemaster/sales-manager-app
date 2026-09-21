import { BulkSettingResult } from '../types/shoppingSetting.types';

export const deleteShoppingSettings = async (ids: string[], ownerId: string): Promise<BulkSettingResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 삭제 실패');
  return response.json();
};
