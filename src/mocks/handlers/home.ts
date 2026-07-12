import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockHomeStats, getMockRecentProducts } from '../utils/getHomeData';
import { getMockHomeOrderStats } from '../utils/getHomeOrderStats';

export const homeHandlers = [
  http.post(`${baseUrl}/api/home/stats`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockHomeStats(ownerId));
  }),

  http.post(`${baseUrl}/api/home/recent-products`, async ({ request }) => {
    const { ownerId } = (await request.json()) as { ownerId: string };
    return HttpResponse.json(getMockRecentProducts(ownerId));
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
