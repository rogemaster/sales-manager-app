import { MallAddress } from '../types/shoppingSetting.types';
import { ShoppingMalls } from '@/types/common.type';

export const getAddressBook = async (mallCode: ShoppingMalls, mallId: string): Promise<MallAddress[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mallCode, mallId }),
  });
  if (!response.ok) throw new Error('주소록 조회 실패');
  return response.json();
};
