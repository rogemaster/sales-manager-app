import { http, HttpResponse } from 'msw';
import { User } from './data/MockUsersData';
import { getMockProducts } from './utils/getProducts';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { createMockProduct } from './utils/createProduct';
import { MOCK_PRODUCT_DATA } from './data/MockProductsData';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const handlers = [
  http.post(`${baseUrl}/api/login`, () => {
    return HttpResponse.json(User[0], {
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

  // 상품목록조회
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const searchParams = (await request.json()) as ProductSearch;
    return HttpResponse.json(getMockProducts(searchParams));
  }),

  // 상품등록
  http.post(`${baseUrl}/api/product/create`, async ({ request }) => {
    const data = (await request.json()) as Product;
    const newProduct = createMockProduct(data);

    MOCK_PRODUCT_DATA.push(newProduct);

    return HttpResponse.json(newProduct);
  }),
];
