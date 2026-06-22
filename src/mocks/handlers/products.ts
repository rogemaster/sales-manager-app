import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { getMockProducts } from '../utils/getProducts';
import { createMockProduct } from '../utils/createProduct';
import { updateMockProduct } from '../utils/updateProduct';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';

export const productHandlers = [
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const searchParams = (await request.json()) as ProductSearch;
    return HttpResponse.json(getMockProducts(searchParams));
  }),

  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const data = (await request.json()) as Product;
    const newProduct = createMockProduct(data);
    MOCK_PRODUCT_DATA.push(newProduct);
    return HttpResponse.json(newProduct);
  }),

  http.get(`${baseUrl}/api/products/:productId`, ({ params }) => {
    const { productId } = params;
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    return HttpResponse.json(data);
  }),

  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const update = (await request.json()) as Product;
    const updated = updateMockProduct(productId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
    await delay(500);
    const data = (await request.json()) as Product[];
    MOCK_PRODUCT_DATA.push(...data);
    return HttpResponse.json({ success: true, count: data.length });
  }),
];
