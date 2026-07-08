import dayjs from 'dayjs';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';

export const updateMockShoppingSettingsStatus = (ids: string[], isActive: boolean): void => {
  const now = dayjs().format('YYYY-MM-DD');
  ids.forEach((id) => {
    const setting = MOCK_SHOPPING_SETTINGS_DATA.find((s) => s.id === id);
    if (setting) {
      setting.isActive = isActive;
      setting.updatedAt = now;
    }
  });
};
