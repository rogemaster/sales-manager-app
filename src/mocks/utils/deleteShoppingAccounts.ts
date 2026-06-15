import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';

export const deleteMockShoppingAccounts = (ids: string[]): void => {
  ids.forEach((id) => {
    const index = MOCK_SHOPPING_ACCOUNTS_DATA.findIndex((account) => account.id === id);
    if (index !== -1) MOCK_SHOPPING_ACCOUNTS_DATA.splice(index, 1);
  });
};
