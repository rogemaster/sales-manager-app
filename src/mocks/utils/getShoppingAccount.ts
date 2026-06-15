import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';

export const getMockShoppingAccount = (id: string): ShoppingAccount | undefined => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.find((account) => account.id === id);
};
