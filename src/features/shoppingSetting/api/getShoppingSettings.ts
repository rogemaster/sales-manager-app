import { GetShoppingSettingsResponse, ShoppingSettingSearchType } from '../types/shoppingSetting.types';

export const getShoppingSettings = async (
  ownerId: string,
  filters: ShoppingSettingSearchType,
  page: number,
  pageSize = 10,
): Promise<GetShoppingSettingsResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId, filters, page, pageSize }),
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 목록 조회 실패');
  return response.json();
};
