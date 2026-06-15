import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import dayjs from 'dayjs';

export const updateMockShoppingAccountsStatus = (ids: string[], isActive: boolean): void => {
  const now = dayjs().format('YYYY-MM-DD');
  ids.forEach((id) => {
    const account = MOCK_SHOPPING_ACCOUNTS_DATA.find((a) => a.id === id);
    if (account) {
      account.isActive = isActive;
      account.updatedAt = now;
    }
  });
};
