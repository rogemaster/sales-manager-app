import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const createMockShoppingSetting = (body: CreateShoppingSettingBody, ownerId: string): ShoppingSetting => {
  const now = dayjs().format('YYYY-MM-DD');
  const newSetting: ShoppingSetting = {
    id: `ss_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_SHOPPING_SETTINGS_DATA.push(newSetting);
  return newSetting;
};
