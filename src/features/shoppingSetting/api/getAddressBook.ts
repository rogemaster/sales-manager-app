import { MallAddress, MallAddressType } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getAddressBook = async (mallAccountId: string, addressType: MallAddressType): Promise<MallAddress[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/addresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mallAccountId, addressType }),
  });
  await throwIfNotOk(response, '주소록 조회 실패');
  return response.json();
};
