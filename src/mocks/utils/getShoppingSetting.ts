import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const getMockShoppingSetting = (id: string): ShoppingSetting | undefined => {
  return MOCK_SHOPPING_SETTINGS_DATA.find((setting) => setting.id === id);
};
