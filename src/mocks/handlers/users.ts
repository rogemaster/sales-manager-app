import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { UserSearchType } from '@/features/account/types/user.types';
import { getMockUsers } from '../utils/getUsers';
import { deleteMockUsers } from '../utils/deleteUsers';

export const userHandlers = [
  http.post(`${baseUrl}/api/account/users/list`, async ({ request }) => {
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: UserSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockUsers(ownerId, filters, page, pageSize));
  }),

  http.delete(`${baseUrl}/api/account/users`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockUsers(ids);
    return HttpResponse.json({ success: true });
  }),
];
