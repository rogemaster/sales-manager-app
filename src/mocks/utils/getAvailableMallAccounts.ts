import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingAccount } from '@/features/shoppingAccount/types/shoppingAccount.types';
import { AvailableMallAccount } from '@/features/shoppingSetting/types/shoppingSetting.types';

/**
 * 계정은 호출자가 넘긴다 — 계정이 Neon에 있어 MSW가 직접 읽을 수 없다.
 * ownerId 필터는 실제 route의 WHERE가 이미 했으므로 여기서 다시 거르지 않는다.
 */
export const getMockAvailableMallAccounts = (accounts: ShoppingAccount[]): AvailableMallAccount[] =>
  accounts.map(({ id, mallCode, mallId }) => ({
    id,
    mallCode,
    mallId,
    settingCount: MOCK_SHOPPING_SETTINGS_DATA.filter((s) => s.mallAccountId === id).length,
  }));
