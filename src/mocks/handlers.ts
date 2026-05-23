import { http, HttpResponse, delay } from 'msw';
import { User } from './data/MockUsersData';
import { MOCK_MALL_ACCOUNTS } from './data/MockShoppingMallAccountsData';
import { getMockProducts } from './utils/getProducts';
import { Product, ProductSearch } from '@/features/products/types/product.types';
import { createMockProduct } from './utils/createProduct';
import { MOCK_PRODUCT_DATA } from './data/MockProductsData';
import { getMockHomeStats, getMockRecentProducts } from './utils/getHomeData';
import { MOCK_ORDERS_DATA } from './data/MockOrdersData';
import { Order, OrderSearchType } from '@/features/order/types/order.types';
import { getMockOrders } from './utils/getOrders';
import { MOCK_ORDER_CLAIMS, MOCK_ORDER_COMMENTS, MOCK_ORDER_HISTORIES, MOCK_ORDER_DETAIL_EXTRAS } from './data/MockOrderExtrasData';
import { OrderDetail, OrderComment, OrderEditHistory } from '@/features/order/types/order.types';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

export const handlers = [
  http.post(`${baseUrl}/api/login`, () => {
    return HttpResponse.json(User[0], {
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

  // 상품목록조회
  http.post(`${baseUrl}/api/products/list`, async ({ request }) => {
    const searchParams = (await request.json()) as ProductSearch;
    return HttpResponse.json(getMockProducts(searchParams));
  }),

  // 상품등록
  http.post(`${baseUrl}/api/products/create`, async ({ request }) => {
    const data = (await request.json()) as Product;
    const newProduct = createMockProduct(data);

    MOCK_PRODUCT_DATA.push(newProduct);

    return HttpResponse.json(newProduct);
  }),

  // 상품조회
  http.get(`${baseUrl}/api/products/:productId`, async ({ params }) => {
    const { productId } = params;
    const data = MOCK_PRODUCT_DATA.find((item) => item.productId === productId);
    return HttpResponse.json(data);
  }),

  // 상품수정
  http.patch(`${baseUrl}/api/products/:productId`, async ({ request, params }) => {
    const { productId } = params;
    const update = (await request.json()) as Product;
    const findIndex = MOCK_PRODUCT_DATA.findIndex((item) => item.productId === productId);

    if (findIndex !== -1) {
      MOCK_PRODUCT_DATA[findIndex] = {
        ...MOCK_PRODUCT_DATA[findIndex],
        ...update,
      };
    }

    console.log('업데이트', MOCK_PRODUCT_DATA[findIndex]);

    return HttpResponse.json(MOCK_PRODUCT_DATA[findIndex]);
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
    const findIndex = MOCK_ORDERS_DATA.findIndex((item) => item.orderNumber === orderId);
    if (findIndex === -1) return new HttpResponse(null, { status: 404 });

    const { claim: claimUpdate, orderDetailAddress, payeeDetailAddress, ...orderUpdate } = update;

    const changedFields = Object.keys(orderUpdate).filter(
      (key) =>
        JSON.stringify(orderUpdate[key as keyof typeof orderUpdate]) !==
        JSON.stringify(MOCK_ORDERS_DATA[findIndex][key as keyof typeof orderUpdate]),
    );

    if (claimUpdate?.handlerNote !== undefined && MOCK_ORDER_CLAIMS[orderId as string]) {
      MOCK_ORDER_CLAIMS[orderId as string].handlerNote = claimUpdate.handlerNote;
      changedFields.push('claim.handlerNote');
    }

    if (orderDetailAddress !== undefined || payeeDetailAddress !== undefined) {
      MOCK_ORDER_DETAIL_EXTRAS[orderId as string] = {
        ...(MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {}),
        ...(orderDetailAddress !== undefined ? { orderDetailAddress } : {}),
        ...(payeeDetailAddress !== undefined ? { payeeDetailAddress } : {}),
      };
    }

    MOCK_ORDERS_DATA[findIndex] = { ...MOCK_ORDERS_DATA[findIndex], ...orderUpdate };

    if (changedFields.length > 0) {
      if (!MOCK_ORDER_HISTORIES[orderId as string]) {
        MOCK_ORDER_HISTORIES[orderId as string] = [];
      }
      const newHistory: OrderEditHistory = {
        id: `history_${Date.now()}`,
        modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        modifiedBy: '담당자',
        changedFields,
      };
      MOCK_ORDER_HISTORIES[orderId as string].push(newHistory);
    }

    const extras = MOCK_ORDER_DETAIL_EXTRAS[orderId as string] ?? {};
    return HttpResponse.json({ ...MOCK_ORDERS_DATA[findIndex], ...extras });
  }),

  // 쇼핑몰 계정 목록 조회 (패스워드 제외)
  http.get(`${baseUrl}/api/mall-accounts`, () => {
    const accounts = MOCK_MALL_ACCOUNTS.map(({ password: _password, ...rest }) => rest);
    return HttpResponse.json(accounts);
  }),

  // 주문 코멘트 추가
  http.post(`${baseUrl}/api/orders/:orderId/comments`, async ({ request, params }) => {
    const { orderId } = params;
    const { content } = (await request.json()) as { content: string };
    if (!MOCK_ORDER_COMMENTS[orderId as string]) {
      MOCK_ORDER_COMMENTS[orderId as string] = [];
    }
    const newComment: OrderComment = {
      id: `comment_${Date.now()}`,
      content,
      authorName: '담당자',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    MOCK_ORDER_COMMENTS[orderId as string].push(newComment);
    return HttpResponse.json(newComment);
  }),
];
