import { LinkedProductCountResponse } from '../types/shoppingSetting.types';

export const getLinkedProductCount = async (ids: string[], ownerId: string): Promise<LinkedProductCountResponse> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/linked-count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Owner-Id': ownerId },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('연동 상품 건수 조회 실패');
  return response.json();
};
