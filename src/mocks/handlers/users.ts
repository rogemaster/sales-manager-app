import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { UserSearchType, CreateUserBody } from '@/features/account/types/user.types';
import { getMockUsers } from '../utils/getUsers';
import { deleteMockUsers } from '../utils/deleteUsers';
import { createMockUser } from '../utils/createUser';

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

  http.post(`${baseUrl}/api/account/users/create`, async ({ request }) => {
    const { ownerId, ...body } = (await request.json()) as CreateUserBody & { ownerId: string };
    const newUser = createMockUser(body, ownerId);
    return HttpResponse.json(newUser, { status: 201 });
  }),
];
