import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import {
  ShoppingSettingSearchType,
  CreateShoppingSettingBody,
  UpdateShoppingSettingBody,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import { getMockShoppingSettings } from '../utils/getShoppingSettings';
import { updateMockShoppingSettingsStatus } from '../utils/updateShoppingSettingsStatus';
import { deleteMockShoppingSettings } from '../utils/deleteShoppingSettings';
import { getMockAvailableMallAccounts } from '../utils/getAvailableMallAccounts';
import { ShoppingMalls } from '@/types/common.type';
import { getMockAddressBook } from '../utils/getAddressBook';
import { getMockShoppingSetting } from '../utils/getShoppingSetting';
import { createMockShoppingSetting } from '../utils/createShoppingSetting';
import { updateMockShoppingSetting } from '../utils/updateShoppingSetting';

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

  http.post(`${baseUrl}/api/shopping/settings/addresses`, async ({ request }) => {
    const { mallCode } = (await request.json()) as { mallCode: ShoppingMalls; mallId: string };
    return HttpResponse.json(getMockAddressBook(mallCode));
  }),

  http.post(`${baseUrl}/api/shopping/settings`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingSettingBody & { ownerId: string };
    return HttpResponse.json(createMockShoppingSetting(body, ownerId), { status: 201 });
  }),

  // status/addresses 등 고정경로를 모두 등록한 뒤 동적경로(/:id)를 등록 - :id가 고정 세그먼트와 매칭되는 것을 방지
  http.get(`${baseUrl}/api/shopping/settings/:id`, ({ params }) => {
    const setting = getMockShoppingSetting(params.id as string);
    if (!setting) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(setting);
  }),

  http.patch(`${baseUrl}/api/shopping/settings/:id`, async ({ request, params }) => {
    const body = (await request.json()) as UpdateShoppingSettingBody;
    const updated = updateMockShoppingSetting(params.id as string, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
];
