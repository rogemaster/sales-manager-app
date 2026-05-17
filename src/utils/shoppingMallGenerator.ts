import { SHOPPING_MALLS } from '@/constant/shoppingMall.constant';

export const getShoppingMallName = (code: string): string => {
  return SHOPPING_MALLS.find((mall) => mall.code === code)?.name ?? code;
};
