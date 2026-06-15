import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount, UpdateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import dayjs from 'dayjs';

export const updateMockShoppingAccount = (id: string, body: UpdateShoppingAccountBody): ShoppingAccount | null => {
  const index = MOCK_SHOPPING_ACCOUNTS_DATA.findIndex((account) => account.id === id);
  if (index === -1) return null;
  MOCK_SHOPPING_ACCOUNTS_DATA[index] = {
    ...MOCK_SHOPPING_ACCOUNTS_DATA[index],
    ...body,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  };
  return MOCK_SHOPPING_ACCOUNTS_DATA[index];
};
