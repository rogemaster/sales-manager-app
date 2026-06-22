import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { UpdateProfileBody } from '@/features/profile/api/updateProfile';
import { updateMockProfile } from '../utils/updateProfile';

export const profileHandlers = [
  http.patch(`${baseUrl}/api/profile`, async ({ request }) => {
    const body = (await request.json()) as UpdateProfileBody;
    const updated = updateMockProfile(body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
];
