import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { CreateMallAccountBody } from '@/shared/api/createMallAccount';
import { getMockMallAccounts, createMockMallAccount, deleteMockMallAccount } from '../utils/mallAccounts';

export const mallAccountHandlers = [
  http.get(`${baseUrl}/api/mall-accounts`, ({ request }) => {
    const mallCode = new URL(request.url).searchParams.get('mallCode');
    return HttpResponse.json(getMockMallAccounts(mallCode));
  }),

  http.post(`${baseUrl}/api/mall-accounts`, async ({ request }) => {
    const body = (await request.json()) as CreateMallAccountBody;
    const created = createMockMallAccount(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(`${baseUrl}/api/mall-accounts/:id`, ({ params }) => {
    const { id } = params;
    const deleted = deleteMockMallAccount(id as string);
    if (!deleted) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ success: true });
  }),
];
