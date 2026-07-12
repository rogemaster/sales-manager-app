import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { MallAccountOption } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { ShoppingMalls } from '@/types/common.type';

export const getMockShoppingAccountsByMall = (ownerId: string, mallCode: ShoppingMalls): MallAccountOption[] => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.filter(
    (account) => account.ownerId === ownerId && account.mallCode === mallCode && account.isActive,
  ).map(({ id, mallCode, mallId }) => ({ id, mallCode, mallId }));
};
