import { ShoppingMalls } from '@/types/common.type';
import { MallAccount } from '@/shared/types/mallAccount.types';

interface GetMallAccountsParams {
  mallCode?: ShoppingMalls;
}

export const getMallAccounts = async ({ mallCode }: GetMallAccountsParams = {}): Promise<MallAccount[]> => {
  const url = new URL(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mall-accounts`);
  if (mallCode) url.searchParams.set('mallCode', mallCode);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('쇼핑몰 계정 목록 조회 실패');
  return response.json();
};
