import { ShoppingMalls } from '@/types/common.type';
import { MallAccount } from '@/shared/types/mallAccount.types';

export interface CreateMallAccountBody {
  mallCode: ShoppingMalls;
  mallName: string;
  mallId: string;
  password: string;
  manager: { name: string; email: string };
}

export const createMallAccount = async (body: CreateMallAccountBody): Promise<MallAccount> => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mall-accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('쇼핑몰 계정 생성 실패');
  return response.json();
};
