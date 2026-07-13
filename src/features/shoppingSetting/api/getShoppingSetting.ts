import { ShoppingSetting } from '../types/shoppingSetting.types';

export const getShoppingSetting = async (id: string, ownerId: string): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`, {
    headers: { 'X-Owner-Id': ownerId },
  });
  if (!response.ok) throw new Error('쇼핑몰 정보설정 조회 실패');
  return response.json();
};
