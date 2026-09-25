import { AvailableMallAccount } from '../types/shoppingSetting.types';
import { throwIfNotOk } from '@/shared/utils/apiResponse';

export const getAvailableMallAccounts = async (): Promise<AvailableMallAccount[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/available-accounts`, {
    method: 'POST',
  });
  await throwIfNotOk(response, '등록 가능한 쇼핑몰계정 조회 실패');
  return response.json();
};
