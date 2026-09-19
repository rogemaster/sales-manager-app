import { sql } from 'drizzle-orm';
import { bigserial, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
// drizzle-kit이 이 파일을 직접 실행하므로 값 import는 @ 별칭 없이 상대 경로로 둔다(타입 import는 지워져 무관하다).
import type { NaverAddressType, NaverProductRequest, NaverStatusType } from './types';

export const NAVER_PRODUCT_NAME_UNIQUE_INDEX = 'naver_products_seller_name_unique';

export const naverSellers = pgTable('naver_sellers', {
  id: text('id').primaryKey(),
  apiKey: text('api_key').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
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
