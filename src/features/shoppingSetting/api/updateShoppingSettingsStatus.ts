import { BulkSettingResult } from '../types/shoppingSetting.types';

export const updateShoppingSettingsStatus = async (
  ids: string[],
  isActive: boolean,
  ownerId: string,
): Promise<BulkSettingResult> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids, isActive }),
  });
  if (!response.ok) throw new Error('사용여부 변경 실패');
  return response.json();
};
