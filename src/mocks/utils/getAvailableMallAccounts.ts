import { MOCK_SHOPPING_ACCOUNTS_DATA } from '../data/MockShoppingAccountsData';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { AvailableMallAccount } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const getMockAvailableMallAccounts = (ownerId: string): AvailableMallAccount[] => {
  return MOCK_SHOPPING_ACCOUNTS_DATA.filter((account) => account.ownerId === ownerId).map((account) => ({
    id: account.id,
    mallCode: account.mallCode,
    mallId: account.mallId,
    settingCount: MOCK_SHOPPING_SETTINGS_DATA.filter((s) => s.mallAccountId === account.id).length,
  }));
};
