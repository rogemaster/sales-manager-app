import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { ShoppingSettingSearchType } from '@/features/shoppingSetting/types/shoppingSetting.types';
import { getMockShoppingSettings } from '../utils/getShoppingSettings';
import { updateMockShoppingSettingsStatus } from '../utils/updateShoppingSettingsStatus';
import { deleteMockShoppingSettings } from '../utils/deleteShoppingSettings';
import { getMockAvailableMallAccounts } from '../utils/getAvailableMallAccounts';

export const shoppingSettingHandlers = [
  http.post(`${baseUrl}/api/shopping/settings/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingSettingSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingSettings(ownerId, filters, page, pageSize));
  }),

  http.patch(`${baseUrl}/api/shopping/settings/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingSettingsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingSettings(ids);
    return HttpResponse.json({ success: true });
  }),

  http.post(`${baseUrl}/api/shopping/settings/available-accounts`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockAvailableMallAccounts(ownerId));
  }),
];
