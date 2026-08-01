import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { getMockProducts } from '../utils/getProducts';
import { createMockProduct } from '../utils/createProduct';
import { updateMockProduct } from '../utils/updateProduct';
import { MOCK_PRODUCT_DATA } from '../data/MockProductsData';
import { isOwnerMatch } from '../utils/verifyOwnership';

export const productHandlers = [
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const { ownerId, page, pageSize, ...searchParams } = (await request.json()) as ProductSearch & {
      ownerId: string;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockProducts(ownerId, searchParams, page, pageSize));
  }),

  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const { ownerId, ...data } = (await request.json()) as Product & { ownerId: string };
    const newProduct = createMockProduct({ ...data, ownerId });
    MOCK_PRODUCT_DATA.push(newProduct);
    return HttpResponse.json(newProduct);
  }),

  http.get(`${baseUrl}/api/products/:productId`, ({ params, request }) => {
    const { productId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(data);
  }),

  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    if (!data || !isOwnerMatch(data.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const update = (await request.json()) as Product;
    const updated = updateMockProduct(productId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, products } = (await request.json()) as { ownerId: string; products: Omit<Product, 'ownerId'>[] };
    MOCK_PRODUCT_DATA.push(...products.map((p) => ({ ...p, ownerId })));
    return HttpResponse.json({ success: true, count: products.length });
  }),
];
