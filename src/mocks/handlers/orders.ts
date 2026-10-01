import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Order } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';

// 주문 목록·상세·수정·클레임·코멘트·이력은 route(/api/orders/*)로 옮겼다(2026-09-30).
// 남은 것은 주문 엑셀 대량등록 경로뿐이다 — 쓰는 화면이 없고, 엑셀 라운드에서 route로 만든다(주문 DB화 결정 4).
// 이 배열은 route가 읽지 않으므로 여기 넣은 주문은 목록에 나오지 않는다.
export const orderHandlers = [
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Omit<Order, 'ownerId'>[] };
    MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
    return HttpResponse.json({ success: true, count: orders.length });
  }),
];
