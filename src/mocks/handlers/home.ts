import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockHomeStats, getMockRecentProducts } from '../utils/getHomeData';
import { getMockHomeOrderStats } from '../utils/getHomeOrderStats';

export const homeHandlers = [
  http.get(`${baseUrl}/api/home/stats`, () => {
    return HttpResponse.json(getMockHomeStats());
  }),

  http.get(`${baseUrl}/api/home/recent-products`, () => {
    return HttpResponse.json(getMockRecentProducts());
  }),

  http.post(`${baseUrl}/api/home/order-stats`, async ({ request }) => {
    const { startDate, endDate } = (await request.json()) as { startDate: string; endDate: string };
    return HttpResponse.json(getMockHomeOrderStats(startDate, endDate));
  }),
];
