import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockHomeStats, getMockRecentProducts } from '../utils/getHomeData';
import { getMockHomeOrderStats } from '../utils/getHomeOrderStats';
import { fetchProductsForMock } from '../utils/fetchProducts';

export const homeHandlers = [
  http.post(`${baseUrl}/api/home/stats`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    const products = await fetchProductsForMock();
    return HttpResponse.json(getMockHomeStats(products, ownerId));
  }),

  http.post(`${baseUrl}/api/home/recent-products`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    const products = await fetchProductsForMock();
    return HttpResponse.json(getMockRecentProducts(products, ownerId));
  }),

  http.post(`${baseUrl}/api/home/order-stats`, async ({ request }) => {
    const { ownerId, startDate, endDate } = (await request.json()) as {
      ownerId: string;
      startDate: string;
      endDate: string;
    };
    return HttpResponse.json(getMockHomeOrderStats(ownerId, startDate, endDate));
  }),
];
