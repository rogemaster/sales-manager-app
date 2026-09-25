import { LinkedProductCountResponse } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getLinkedProductCount = async (ids: string[]): Promise<LinkedProductCountResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/linked-count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  await throwIfNotOk(response, '연동 상품 건수 조회 실패');
  return response.json();
};
