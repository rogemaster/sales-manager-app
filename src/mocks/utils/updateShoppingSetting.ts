import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import { ShoppingSetting, UpdateShoppingSettingBody } from '@/features/shoppingSetting/types/shoppingSetting.types';

export const updateMockShoppingSetting = (id: string, body: UpdateShoppingSettingBody): ShoppingSetting | null => {
  const index = MOCK_SHOPPING_SETTINGS_DATA.findIndex((setting) => setting.id === id);
  if (index === -1) return null;
  // spread는 discriminated union의 mallCode/mallSettings 상관관계를 지워버리므로 단언이 필요
  MOCK_SHOPPING_SETTINGS_DATA[index] = {
    ...MOCK_SHOPPING_SETTINGS_DATA[index],
    ...body,
    ownerId: MOCK_SHOPPING_SETTINGS_DATA[index].ownerId,
    updatedAt: dayjs().format('YYYY-MM-DD'),
  } as ShoppingSetting;
  return MOCK_SHOPPING_SETTINGS_DATA[index];
};
