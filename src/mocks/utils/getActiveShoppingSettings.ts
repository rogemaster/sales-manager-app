import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ActiveShoppingSettingOption } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const getMockActiveShoppingSettings = (ownerId: string): ActiveShoppingSettingOption[] => {
  return MOCK_SHOPPING_SETTINGS_DATA.filter((setting) => setting.ownerId === ownerId && setting.isActive).map(
    ({ id, mallCode, mallId, nickname }) => ({ id, mallCode, mallId, nickname }),
  );
};
