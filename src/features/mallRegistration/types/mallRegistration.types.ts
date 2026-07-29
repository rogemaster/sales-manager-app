import { ShoppingMalls } from '@/types/common.type';

export interface ActiveShoppingSettingOption {
  id: string;
  mallCode: ShoppingMalls;
  mallId: string;
  nickname: string;
}

export interface StagedRegistration {
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
  nickname: string;
}

export interface MallRegistrationRequestItem {
  productId: string;
  mallCode: ShoppingMalls;
  shoppingSettingId: string;
}
