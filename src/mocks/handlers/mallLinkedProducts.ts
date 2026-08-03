import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import {
  MallLinkedProductRequestItem,
  MallLinkedProductSearch,
  ResendMallLinkedProductsBody,
  UpdateMallLinkedProductBody,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { areLinkedProductsOwnedBy, areMallLinkRequestsOwnedBy } from '../utils/verifyOwnership';
import { createMockMallLinkedProducts } from '../utils/createMallLinkedProducts';
import { getMockMallLinkedProducts } from '../utils/getMallLinkedProducts';
import { getMockMallLinkedProduct } from '../utils/getMallLinkedProduct';
import { updateMockMallLinkedProduct } from '../utils/updateMallLinkedProduct';
import { resendMockMallLinkedProducts } from '../utils/resendMallLinkedProducts';

export const mallLinkedProductHandlers = [
  http.post(`${baseUrl}/api/shopping/linked-products/list`, async ({ request }) => {
    const { ownerId, page, pageSize, ...searchParams } = (await request.json()) as MallLinkedProductSearch & {
      ownerId: string;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockMallLinkedProducts(ownerId, searchParams, page, pageSize));
  }),

  http.post(`${baseUrl}/api/shopping/linked-products`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, createdByEmail, items } = (await request.json()) as {
      ownerId: string;
      createdByEmail: string;
      items: MallLinkedProductRequestItem[];
    };

    if (!areMallLinkRequestsOwnedBy(items, ownerId)) {
      return new HttpResponse(null, { status: 403 });
    }

    return HttpResponse.json(createMockMallLinkedProducts(items, ownerId, createdByEmail));
  }),

  http.post(`${baseUrl}/api/shopping/linked-products/resend`, async ({ request }) => {
    // 외부 쇼핑몰 API 응답 지연 시뮬레이션
    await delay(800);
    const { ownerId, ids } = (await request.json()) as ResendMallLinkedProductsBody;

    if (!areLinkedProductsOwnedBy(ids, ownerId)) {
      return new HttpResponse(null, { status: 403 });
    }

    return HttpResponse.json(resendMockMallLinkedProducts(ids, ownerId));
  }),

  http.get(`${baseUrl}/api/shopping/linked-products/:id`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const linked = getMockMallLinkedProduct(params.id as string, ownerId);
    if (!linked) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(linked);
  }),

  http.patch(`${baseUrl}/api/shopping/linked-products/:id`, async ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    const body = (await request.json()) as UpdateMallLinkedProductBody;
    const updated = updateMockMallLinkedProduct(params.id as string, ownerId, body);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),
];
