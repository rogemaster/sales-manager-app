import { ShoppingSetting } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getShoppingSetting = async (id: string): Promise<ShoppingSetting> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/${id}`);
  await throwIfNotOk(response, '쇼핑몰 정보설정 조회 실패');
  return response.json();
};
