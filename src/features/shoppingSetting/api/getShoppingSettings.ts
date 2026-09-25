import { GetShoppingSettingsResponse, ShoppingSettingSearchType } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getShoppingSettings = async (
  filters: ShoppingSettingSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingSettingsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, page, pageSize }),
  });
  await throwIfNotOk(response, '쇼핑몰 정보설정 목록 조회 실패');
  return response.json();
};
