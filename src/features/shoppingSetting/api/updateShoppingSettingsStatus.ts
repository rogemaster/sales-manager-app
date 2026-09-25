import { BulkSettingResult } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const updateShoppingSettingsStatus = async (ids: string[], isActive: boolean): Promise<BulkSettingResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, isActive }),
  });
  await throwIfNotOk(response, '사용여부 변경 실패');
  return response.json();
};
