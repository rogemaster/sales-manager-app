import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { checkEmailAvailability } from '../utils/checkEmail';
import { registerMockUser } from '../utils/registerUser';
import { RegisterFormData } from '@/features/auth/util/registerValidation';
import { loginUser } from '../utils/loginUser';

export const authHandlers = [
  http.post(`${baseUrl}/api/check-email`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string };
    const available = checkEmailAvailability(email);
    return HttpResponse.json({ available });
  }),

  http.post(`${baseUrl}/api/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterFormData & { businessLicenseName: string };
    if (!checkEmailAvailability(body.email)) {
      return new HttpResponse(null, { status: 400 });
    }
    registerMockUser(body);
    return new HttpResponse(null, { status: 201 });
  }),

  http.post(`${baseUrl}/api/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = loginUser(email, password);
    if (!user) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(user, {
      headers: {
        'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
      },
    });
  }),

  http.post(`${baseUrl}/api/logout`, () => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0',
      },
    });
  }),
];
