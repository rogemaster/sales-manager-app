import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import {
  MallLinkedProductRequestItem,
  MallLinkedProductSearch,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import { areMallLinkRequestsOwnedBy } from '../utils/verifyOwnership';
import { createMockMallLinkedProducts } from '../utils/createMallLinkedProducts';
import { getMockMallLinkedProducts } from '../utils/getMallLinkedProducts';

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
];
