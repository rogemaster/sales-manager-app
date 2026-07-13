import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import {
  ShoppingAccountSearchType,
  CreateShoppingAccountBody,
  UpdateShoppingAccountBody,
} from '@/features/shoppingAccount/types/shoppingAccount.types';
import { getMockShoppingAccounts } from '../utils/getShoppingAccounts';
import { getMockShoppingAccount } from '../utils/getShoppingAccount';
import { createMockShoppingAccount } from '../utils/createShoppingAccount';
import { updateMockShoppingAccount } from '../utils/updateShoppingAccount';
import { deleteMockShoppingAccounts } from '../utils/deleteShoppingAccounts';
import { updateMockShoppingAccountsStatus } from '../utils/updateShoppingAccountsStatus';
import { getMockShoppingAccountsByMall } from '../utils/getShoppingAccountsByMall';
import { isOwnerMatch } from '../utils/verifyOwnership';
import { ShoppingMalls } from '@/types/common.type';

export const shoppingAccountHandlers = [
  http.post(`${baseUrl}/api/shopping/accounts/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: ShoppingAccountSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockShoppingAccounts(ownerId, filters, page, pageSize));
  }),

  http.post(`${baseUrl}/api/shopping/accounts/by-mall`, async ({ request }) => {
    const { ownerId, mallCode } = (await request.json()) as { ownerId: string; mallCode: ShoppingMalls };
    return HttpResponse.json(getMockShoppingAccountsByMall(ownerId, mallCode));
  }),

  http.post(`${baseUrl}/api/shopping/accounts`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateShoppingAccountBody & { ownerId: string };
    const newAccount = createMockShoppingAccount(body, ownerId);
    return HttpResponse.json(newAccount, { status: 201 });
  }),

  http.post(`${baseUrl}/api/shopping/accounts/delete`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockShoppingAccounts(ids);
    return HttpResponse.json({ success: true });
  }),

  // status 핸들러는 :id 핸들러보다 먼저 등록해야 경로 충돌 방지
  http.patch(`${baseUrl}/api/shopping/accounts/status`, async ({ request }) => {
    const { ids, isActive } = (await request.json()) as { ids: string[]; isActive: boolean };
    updateMockShoppingAccountsStatus(ids, isActive);
    return HttpResponse.json({ success: true });
  }),

  http.patch(`${baseUrl}/api/shopping/accounts/:id`, async ({ request, params }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const existing = getMockShoppingAccount(params.id as string);
    if (!existing || !isOwnerMatch(existing.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as UpdateShoppingAccountBody;
    const updated = updateMockShoppingAccount(params.id as string, body);
    return HttpResponse.json(updated);
  }),

  http.get(`${baseUrl}/api/shopping/accounts/:id`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const account = getMockShoppingAccount(params.id as string);
    if (!account || !isOwnerMatch(account.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(account);
  }),
];
