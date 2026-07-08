import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';

export const deleteMockShoppingSettings = (ids: string[]): void => {
  ids.forEach((id) => {
    const index = MOCK_SHOPPING_SETTINGS_DATA.findIndex((s) => s.id === id);
    if (index !== -1) MOCK_SHOPPING_SETTINGS_DATA.splice(index, 1);
  });
};
