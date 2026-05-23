import { MallAccount } from '@/shared/types/mallAccount.types';

export const getMallAccounts = async (): Promise<MallAccount[]> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mall-accounts`);
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
