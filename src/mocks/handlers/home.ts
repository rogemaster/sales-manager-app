import { http, HttpResponse } from 'msw';
import { baseUrl } from '../config';
import { getMockHomeOrderStats } from '../utils/getHomeOrderStats';

// 상품 통계·최근 상품은 실제 route(/api/home/stats, /api/home/recent-products)가 처리한다.
// 주문 데이터는 아직 mock이라 주문 통계만 여기 남는다.
export const homeHandlers = [
  http.post(`${baseUrl}/api/home/order-stats`, async ({ request }) => {
    const { ownerId, startDate, endDate } = (await request.json()) as {
      ownerId: string;
      startDate: string;
      endDate: string;
    };
    return HttpResponse.json(getMockHomeOrderStats(ownerId, startDate, endDate));
  }),
];
