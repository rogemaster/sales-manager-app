import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { ShoppingAccount, CreateShoppingAccountBody } from '@/features/shoppingAccount/types/shoppingAccount.types';
import dayjs from 'dayjs';

export const createMockShoppingAccount = (body: CreateShoppingAccountBody, ownerId: string): ShoppingAccount => {
  const now = dayjs().format('YYYY-MM-DD');
  const newAccount: ShoppingAccount = {
    id: `sa_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_SHOPPING_ACCOUNTS_DATA.push(newAccount);
  return newAccount;
};
