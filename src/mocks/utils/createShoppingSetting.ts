import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, CreateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const createMockShoppingSetting = (body: CreateShoppingSettingBody, ownerId: string): ShoppingSetting => {
  const now = dayjs().format('YYYY-MM-DD');
  // spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
  const newSetting = {
    id: `ss_${Date.now()}`,
    ownerId,
    ...body,
    createdAt: now,
    updatedAt: now,
  } as ShoppingSetting;
  MOCK_SHOPPING_SETTINGS_DATA.push(newSetting);
  return newSetting;
};
