import { ShoppingMalls } from '@/types/common.type';

export type ProductCondition = 'NEW' | 'USED'; // 신상품 / 중고상품
export type SalesPeriod = 7 | 15 | 30 | 60 | 90;

export interface MallAddress {
  code: string; // 출고지코드 / 반품지코드 (몰 내부 식별자)
  name: string; // 출고지명 / 반품지명
  zipCode: string;
  address: string;
  addressDetail: string;
}

export interface ShoppingSetting {
  id: string;
  mallAccountId: string; // 참조: ShoppingAccount.id
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
  isActive: boolean;
  productCondition: ProductCondition;
  salesPeriod: SalesPeriod;
  shippingAddress: MallAddress | null;
  returnAddress: MallAddress | null;
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

export type CreateShoppingSettingBody = Omit<ShoppingSetting, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;
export type UpdateShoppingSettingBody = Partial<CreateShoppingSettingBody>;
