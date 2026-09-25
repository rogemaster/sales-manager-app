import { BulkSettingResult } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const deleteShoppingSettings = async (ids: string[]): Promise<BulkSettingResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await throwIfNotOk(response, '쇼핑몰 정보설정 삭제 실패');
  return response.json();
};
