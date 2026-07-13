import { http, HttpResponse, delay } from 'msw';
import { baseUrl } from '../config';
import { Order, OrderDetail, OrderSearchType } from '@/features/order/types/order.types';
import { MOCK_ORDERS_DATA } from '../data/MockOrdersData';
import { MOCK_ORDER_CLAIMS, MOCK_ORDER_COMMENTS, MOCK_ORDER_HISTORIES, MOCK_ORDER_DETAIL_EXTRAS } from '../data/MockOrderExtrasData';
import { getMockOrders } from '../utils/getOrders';
import { updateMockOrder } from '../utils/updateOrder';
import { addMockOrderComment } from '../utils/addOrderComment';
import { isOwnerMatch } from '../utils/verifyOwnership';

const findOwnedOrder = (orderId: string, ownerId: string | null) => {
  const order = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
  return order && isOwnerMatch(order.ownerId, ownerId) ? order : null;
};

export const orderHandlers = [
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const { ownerId, orders } = (await request.json()) as { ownerId: string; orders: Omit<Order, 'ownerId'>[] };
    MOCK_ORDERS_DATA.push(...orders.map((o) => ({ ...o, ownerId })));
    return HttpResponse.json({ success: true, count: orders.length });
  }),

  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    await delay(300);
    const { ownerId, filters, page, pageSize } = (await request.json()) as {
      ownerId: string;
      filters: OrderSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockOrders(ownerId, filters, page, pageSize));
  }),

  http.get(`${baseUrl}/api/orders/:orderId`, ({ params, request }) => {
    const { orderId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
    if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const extras = MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {};
    const order: OrderDetail = { ...base, ...extras };
    return HttpResponse.json(order);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/claim`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const claim = MOCK_ORDER_CLAIMS[params.orderId as string] ?? null;
    return HttpResponse.json(claim);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/comments`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const comments = MOCK_ORDER_COMMENTS[params.orderId as string] ?? [];
    return HttpResponse.json(comments);
  }),

  http.get(`${baseUrl}/api/orders/:orderId/history`, ({ params, request }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const history = MOCK_ORDER_HISTORIES[params.orderId as string] ?? [];
    return HttpResponse.json(history);
  }),

  http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
    await delay(300);
    const { orderId } = params;
    const ownerId = request.headers.get('X-Owner-Id');
    const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
    if (!base || !isOwnerMatch(base.ownerId, ownerId)) return new HttpResponse(null, { status: 404 });
    const update = (await request.json()) as Partial<OrderDetail>;
    const updated = updateMockOrder(orderId as string, update);
    return HttpResponse.json(updated);
  }),

  http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
    const ownerId = request.headers.get('X-Owner-Id');
    if (!findOwnedOrder(params.orderId as string, ownerId)) return new HttpResponse(null, { status: 404 });
    const { content } = (await request.json()) as { content: string };
    const newComment = addMockOrderComment(params.orderId as string, content);
    return HttpResponse.json(newComment);
  }),
];
