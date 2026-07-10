import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const updateMockShoppingSetting = (id: string, body: UpdateShoppingSettingBody): ShoppingSetting | null => {
  const index = MOCK_SHOPPING_SETTINGS_DATA.findIndex((setting) => setting.id === id);
  if (index === -1) return null;
  MOCK_SHOPPING_SETTINGS_DATA[index] = {
    ...MOCK_SHOPPING_SETTINGS_DATA[index],
    ...body,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  };
  return MOCK_SHOPPING_SETTINGS_DATA[index];
};
