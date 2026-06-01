import { http, HttpResponse, delay } from 'msw';
import { getMockProducts } from './utils/getProducts';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { createMockProduct } from './utils/createProduct';
import { MOCK_PRODUCT_DATA } from './data/MockProductsData';
import { getMockHomeStats, getMockRecentProducts } from './utils/getHomeData';
import { MOCK_ORDERS_DATA } from './data/MockOrdersData';
import { Order, OrderDetail, OrderSearchType } from '@/features/order/types/order.types';
import { getMockOrders } from './utils/getOrders';
import { MOCK_ORDER_CLAIMS, MOCK_ORDER_COMMENTS, MOCK_ORDER_HISTORIES, MOCK_ORDER_DETAIL_EXTRAS } from './data/MockOrderExtrasData';
import { updateMockProduct } from './utils/updateProduct';
import { updateMockOrder } from './utils/updateOrder';
import { addMockOrderComment } from './utils/addOrderComment';
import { getMockMallAccounts, createMockMallAccount, deleteMockMallAccount } from './utils/mallAccounts';
import { CreateMallAccountBody } from '@/shared/api/createMallAccount';
import { CollectionSearchParams, TriggerCollectionBody } from '@/features/order/types/collection.types';
import { getCollectionJobsMock } from './utils/getCollectionJobs';
import { triggerOrderCollectionMock } from './utils/triggerOrderCollection';
import { getMockUsers } from './utils/getUsers';
import { deleteMockUsers } from './utils/deleteUsers';
import { loginUser } from './utils/loginUser';
import { createMockUser } from './utils/createUser';
import { UserSearchType, CreateUserBody } from '@/features/account/types/user.types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const handlers = [
  http.post(`${baseUrl}/api/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string };
    const user = loginUser(email, password);
    if (!user) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(user, {
      headers: {
        'Set-Cookie': 'connect.sid=msw-cookie;HttpOnly;Path=/',
      },
    });
  }),

  http.post(`${baseUrl}/api/logout`, () => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'connect.sid=;HttpOnly;Path=/;Max-Age=0',
      },
    });
  }),

  // 홈 통계
  http.get(`${baseUrl}/api/home/stats`, () => {
    return HttpResponse.json(getMockHomeStats());
  }),

  // 홈 최근 등록 상품
  http.get(`${baseUrl}/api/home/recent-products`, () => {
    return HttpResponse.json(getMockRecentProducts());
  }),

  // 상품 목록 조회
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const searchParams = (await request.json()) as ProductSearch;
    return HttpResponse.json(getMockProducts(searchParams));
  }),

  // 상품 등록
  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const data = (await request.json()) as Product;
    const newProduct = createMockProduct(data);
    MOCK_PRODUCT_DATA.push(newProduct);
    return HttpResponse.json(newProduct);
  }),

  // 상품 단건 조회
  http.get(`${baseUrl}/api/products/:productId`, ({ params }) => {
    const { productId } = params;
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    return HttpResponse.json(data);
  }),

  // 상품 수정
  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const update = (await request.json()) as Product;
    const updated = updateMockProduct(productId as string, update);
    return HttpResponse.json(updated);
  }),

  // 상품 대량 등록
  http.post(`${baseUrl}/api/products/bulk`, async ({ request }) => {
    await delay(500);
    const data = (await request.json()) as Product[];
    MOCK_PRODUCT_DATA.push(...data);
    return HttpResponse.json({ success: true, count: data.length });
  }),

  // 주문 대량 등록
  http.post(`${baseUrl}/api/orders/bulk`, async ({ request }) => {
    await delay(500);
    const data = (await request.json()) as Order[];
    MOCK_ORDERS_DATA.push(...data);
    return HttpResponse.json({ success: true, count: data.length });
  }),

  // 주문 목록 조회
  http.post(`${baseUrl}/api/orders/list`, async ({ request }) => {
    await delay(300);
    const { filters, page, pageSize } = (await request.json()) as {
      filters: OrderSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockOrders(filters, page, pageSize));
  }),

  // 주문 단건 조회
  http.get(`${baseUrl}/api/orders/:orderId`, ({ params }) => {
    const { orderId } = params;
    const base = MOCK_ORDERS_DATA.find((item) => item.orderNumber === orderId);
    if (!base) return new HttpResponse(null, { status: 404 });
    const extras = MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {};
    const order: OrderDetail = { ...base, ...extras };
    return HttpResponse.json(order);
  }),

  // 주문 클레임 조회
  http.get(`${baseUrl}/api/orders/:orderId/claim`, ({ params }) => {
    const { orderId } = params;
    const claim = MOCK_ORDER_CLAIMS[orderId as string] ?? null;
    return HttpResponse.json(claim);
  }),

  // 주문 코멘트 목록 조회
  http.get(`${baseUrl}/api/orders/:orderId/comments`, ({ params }) => {
    const { orderId } = params;
    const comments = MOCK_ORDER_COMMENTS[orderId as string] ?? [];
    return HttpResponse.json(comments);
  }),

  // 주문 수정이력 조회
  http.get(`${baseUrl}/api/orders/:orderId/history`, ({ params }) => {
    const { orderId } = params;
    const history = MOCK_ORDER_HISTORIES[orderId as string] ?? [];
    return HttpResponse.json(history);
  }),

  // 주문 수정
  http.patch(`${baseUrl}/api/orders/:orderId`, async ({ request, params }) => {
    await delay(300);
    const { orderId } = params;
    const update = (await request.json()) as Partial<OrderDetail>;
    const updated = updateMockOrder(orderId as string, update);
    if (!updated) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // 주문 코멘트 추가
  http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
    const { orderId } = params;
    const { content } = (await request.json()) as { content: string };
    const newComment = addMockOrderComment(orderId as string, content);
    return HttpResponse.json(newComment);
  }),

  // 쇼핑몰 계정 목록 조회
  http.get(`${baseUrl}/api/mall-accounts`, ({ request }) => {
    const mallCode = new URL(request.url).searchParams.get('mallCode');
    return HttpResponse.json(getMockMallAccounts(mallCode));
  }),

  // 쇼핑몰 계정 생성
  http.post(`${baseUrl}/api/mall-accounts`, async ({ request }) => {
    const body = (await request.json()) as CreateMallAccountBody;
    const created = createMockMallAccount(body);
    return HttpResponse.json(created, { status: 201 });
  }),

  // 쇼핑몰 계정 삭제
  http.delete(`${baseUrl}/api/mall-accounts/:id`, ({ params }) => {
    const { id } = params;
    const deleted = deleteMockMallAccount(id as string);
    if (!deleted) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ success: true });
  }),

  // 수집 작업 목록 조회
  http.get(`${baseUrl}/api/order/collection/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const params: CollectionSearchParams = {
      startDate: url.searchParams.get('startDate') ?? '',
      endDate: url.searchParams.get('endDate') ?? '',
      mallCode: url.searchParams.get('mallCode') ?? 'ALL',
      mallAccountId: url.searchParams.get('mallAccountId') ?? 'ALL',
    };
    return HttpResponse.json(getCollectionJobsMock(params));
  }),

  // 주문수집 트리거
  http.post(`${baseUrl}/api/order/collection/trigger`, async ({ request }) => {
    await delay(300);
    const { jobIds } = (await request.json()) as TriggerCollectionBody;
    const triggeredCount = triggerOrderCollectionMock(jobIds);
    return HttpResponse.json({ success: true, triggeredCount });
  }),

  // 사용자 목록 조회
  http.post(`${baseUrl}/api/account/users/list`, async ({ request }) => {
    const { filters, page, pageSize } = (await request.json()) as {
      filters: UserSearchType;
      page: number;
      pageSize: number;
    };
    return HttpResponse.json(getMockUsers(filters, page, pageSize));
  }),

  // 사용자 일괄 삭제
  http.delete(`${baseUrl}/api/account/users`, async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    deleteMockUsers(ids);
    return HttpResponse.json({ success: true });
  }),

  // 사용자 등록
  http.post(`${baseUrl}/api/account/users/create`, async ({ request }) => {
    const body = (await request.json()) as CreateUserBody;
    const newUser = createMockUser(body);
    return HttpResponse.json(newUser, { status: 201 });
  }),
];
