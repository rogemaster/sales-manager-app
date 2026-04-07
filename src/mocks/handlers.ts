import { http, HttpResponse } from 'msw';
import { User } from './data/MockUsersData';
import { MOCK_PRODUCT_DATA } from './data/MockProductsData';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const handlers = [
  http.post(`${baseUrl}/api/login`, () => {
    console.log('로그인');
    return HttpResponse.json(User[0], {
      headers: {
        'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
      },
    });
  }),

  http.post(`${baseUrl}/api/logout`, () => {
    console.log('로그아웃');
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0',
      },
    });
  }),

  // 상품목록조회
  http.get(`${baseUrl}/api/products/list`, ({ request, params }) => {
    console.log('상품목록조회', params);
    return HttpResponse.json(MOCK_PRODUCT_DATA);
  }),

  // 상품등록
  http.post(`${baseUrl}/api/products/create`, ({ request, params }) => {
    console.log('상품등록', params);
    return HttpResponse.json(MOCK_PRODUCT_DATA[0]);
  }),
];
