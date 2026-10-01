import { sql } from 'drizzle-orm';
import { bigint, bigserial, index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
// drizzle-kit이 이 파일을 직접 실행하므로 값 import는 @ 별칭 없이 상대 경로로 둔다(타입 import는 지워져 무관하다).
import type {
  NaverAddressType,
  NaverPlaceOrderStatus,
  NaverProductOrderPayload,
  NaverProductOrderStatus,
  NaverProductRequest,
  NaverStatusType,
} from './types';

export const NAVER_PRODUCT_NAME_UNIQUE_INDEX = 'naver_products_seller_name_unique';

export const naverSellers = pgTable('naver_sellers', {
  id: text('id').primaryKey(),
  apiKey: text('api_key').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  // 마지막으로 주문을 만든 시각. null이면 아직 만든 적 없다 — 첫 조회에서 5건을 만든다.
  ordersGeneratedAt: timestamp('orders_generated_at', { withTimezone: true }),
});

export const naverProducts = pgTable(
  'naver_products',
  {
    productNo: bigserial('product_no', { mode: 'number' }).primaryKey(),
    sellerId: text('seller_id').notNull(),
    name: text('name').notNull(),
    statusType: text('status_type').$type<NaverStatusType>().notNull(),
    // 판정에 쓰지 않는 나머지는 통째로 담는다 — 시뮬레이터에는 목록 조회 API가 없어 검색 조건이 없다.
    payload: jsonb('payload').$type<NaverProductRequest>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // productService의 normalizeProductName(trim + toLowerCase)과 같은 식이어야 한다.
    // 한쪽만 바꾸면 서비스가 통과시킨 이름을 DB가 거부한다.
    uniqueIndex(NAVER_PRODUCT_NAME_UNIQUE_INDEX).on(table.sellerId, sql`lower(btrim(${table.name}))`),
  ],
);

export const naverAddresses = pgTable('naver_addresses', {
  // text다 — 우리 MallAddress.code가 문자열이라 그대로 맞물린다.
  addressId: text('address_id').primaryKey(),
  sellerId: text('seller_id').notNull(),
  addressType: text('address_type').$type<NaverAddressType>().notNull(),
  name: text('name').notNull(),
  zipCode: text('zip_code').notNull(),
  address: text('address').notNull(),
  addressDetail: text('address_detail').notNull(),
});

/** 주문은 조회 1페이지 요청 때 시뮬레이터가 만든다(orderService.generateOrders). */
export const naverProductOrders = pgTable(
  'naver_product_orders',
  {
    productOrderId: text('product_order_id').primaryKey(),
    orderId: text('order_id').notNull(),
    sellerId: text('seller_id').notNull(),
    productNo: bigint('product_no', { mode: 'number' })
      .notNull()
      .references(() => naverProducts.productNo),
    productOrderStatus: text('product_order_status').$type<NaverProductOrderStatus>().notNull(),
    placeOrderStatus: text('place_order_status').$type<NaverPlaceOrderStatus>().notNull(),
    paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    // 조회 기준. 생성·발주확인·발송처리 때 갱신한다.
    lastChangedAt: timestamp('last_changed_at', { withTimezone: true }).notNull(),
    deliveryCompany: text('delivery_company'),
    trackingNumber: text('tracking_number'),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    payload: jsonb('payload').$type<NaverProductOrderPayload>().notNull(),
  },
  (table) => [
    index('naver_product_orders_seller_changed_idx').on(table.sellerId, table.lastChangedAt, table.productOrderId),
  ],
);
