import { AvailableMallAccount } from '../types/shoppingSetting.types';

export const getAvailableMallAccounts = async (ownerId: string): Promise<AvailableMallAccount[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/shopping/settings/available-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  });
  if (!response.ok) throw new Error('등록 가능한 쇼핑몰계정 조회 실패');
  return response.json();
};
