import { ShoppingMalls } from '@/types/common.type';

export interface ShoppingSetting {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingSettingSearchType {
  dateType: 'createdAt' | 'updatedAt';
  startDate: string;
  endDate: string;
  mallCode: ShoppingMalls | 'ALL';
  mallAccountId: string; // 'ALL' 기본값, ShoppingAccount.id 참조
  searchValue: string;
}

export interface GetShoppingSettingsResponse {
  settings: ShoppingSetting[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AvailableMallAccount {
  id: string; // ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  settingCount: number;
}
