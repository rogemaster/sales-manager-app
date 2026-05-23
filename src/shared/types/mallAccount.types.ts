import { ShoppingMalls } from '@/types/common.type';

export interface MallAccount {
  id: string;
  mallCode: ShoppingMalls;
  mallName: string;
  mallId: string;
  manager: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
}
