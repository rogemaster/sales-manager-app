import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';

export const authHandlers = [
  http.post(`${baseUrl}/api/logout`, () => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0',
      },
    });
  }),
];
