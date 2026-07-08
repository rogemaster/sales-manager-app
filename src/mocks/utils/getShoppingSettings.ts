import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { MOCK_SHOPPING_SETTINGS_DATA } from '../data/MockShoppingSettingsData';
import {
  GetShoppingSettingsResponse,
  ShoppingSettingSearchType,
} from '@/features/shoppingSetting/types/shoppingSetting.types';

dayjs.extend(isBetween);

export const getMockShoppingSettings = (
  ownerId: string,
  filters: ShoppingSettingSearchType,
  page: number,
  pageSize: number,
): GetShoppingSettingsResponse => {
  const { dateType, startDate, endDate, mallCode, mallAccountId, searchValue } = filters;

  const filtered = MOCK_SHOPPING_SETTINGS_DATA.filter((setting) => {
    if (setting.ownerId !== ownerId) return false;
    const dateValue = dateType === 'createdAt' ? setting.createdAt : setting.updatedAt;
    if (!dayjs(dateValue).isBetween(startDate, endDate, 'day', '[]')) return false;
    if (mallCode !== 'ALL' && setting.mallCode !== mallCode) return false;
    if (mallAccountId !== 'ALL' && setting.mallAccountId !== mallAccountId) return false;
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      const matches =
        setting.mallId.toLowerCase().includes(keyword) || setting.nickname.toLowerCase().includes(keyword);
      if (!matches) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const settings = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { settings, total, page, pageSize, totalPages };
};
