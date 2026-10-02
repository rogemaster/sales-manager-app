import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  boolean,
  index,
  bigserial,
  foreignKey,
} from 'drizzle-orm/pg-core';
import type { OptionCombination, ProductInformationDisclosure, Product } from '@/features/products/types/product.types';
import type {
  MallAddress,
  NaverSettingAttributes,
  KakaoSettingAttributes,
} from '@/features/shoppingSetting/types/shoppingSetting.types';
import type { StoredSettingSnapshot } from '@/features/mallLinkedProduct/util/linkedProductRecord';
import type {
  MallLinkSendAction,
  MallLinkSendSource,
  MallLinkStatus,
} from '@/features/mallLinkedProduct/types/mallLinkedProduct.types';
import type { ShoppingMalls } from '@/types/common.type';
import type { DeliveryTypeId } from '@/shared/constant/delivery.constant';
import type { MallSyncAction, OrderClaimType, OrderStatusTypes } from '@/features/order/types/order.types';
import type { CollectionResultStatus } from '@/features/order/types/collection.types';
// drizzle-kit이 이 파일을 직접 실행하므로 값 import는 @ 별칭 없이 상대 경로로 둔다(타입 import는 지워져 무관하다).
import { CUSTOMER_CODE_UNIQUE_INDEX } from '../lib/customerCodeUniqueViolation';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id'),
  status: text('status').notNull().default('active'),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull().default(''),
  avatar: text('avatar'),
  phone: text('phone').notNull().default(''),
  bio: text('bio').notNull().default(''),
  company: text('company').notNull().default(''),
  location: text('location').notNull().default(''),
  grade: text('grade').notNull().default('super_admin'),

  // 회사 정보
  representativeName: text('representative_name').notNull().default(''),
  businessNumber: text('business_number').notNull().default(''),
  businessCategory: text('business_category').notNull().default(''),
  businessLicenseName: text('business_license_name').notNull().default(''),

  // 담당자 정보
  contactEmail: text('contact_email').notNull().default(''),

  // 정산담당자 정보
  settlementName: text('settlement_name').notNull().default(''),
  settlementEmail: text('settlement_email').notNull().default(''),
  settlementPhone: text('settlement_phone').notNull().default(''),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const products = pgTable(
  'products',
  {
    productId: text('product_id').primaryKey(),
    ownerId: text('owner_id').notNull(),

    // 목록 검색·정렬·페이징에 쓰이는 값들
    name: text('name').notNull(),
    categoryId: text('category_id').notNull(),
    state: text('state').notNull(),
    createDate: timestamp('create_date', { withTimezone: true }).notNull(),
    updateDate: timestamp('update_date', { withTimezone: true }).notNull(),

    customerCode: text('customer_code'),
    price: integer('price').notNull(),
    netPrice: integer('net_price'),
    deliveryType: text('delivery_type').notNull(),
    deliveryPrice: integer('delivery_price').notNull(),
    totalQuantity: integer('total_quantity').notNull(),

    /**
     * R2 key(`images/<ownerId>/<uuid>.<png|jpg>`)만 담는다. 화면 업로드는 /api/products/image, 엑셀의 외부 이미지
     * 주소는 /api/products/image/import를 거쳐 key가 된다. 표시할 때는 toProductImageUrl로 공개 주소를 붙인다.
     * 2026-09-13 이전에는 절대 URL과의 합집합이었고, 남아 있던 값은 일회성 스크립트로 이전했다.
     */
    mainImage: text('main_image').notNull(),

    detailPage: text('detail_page').notNull(),
    brand: text('brand').notNull(),
    manufacturer: text('manufacturer').notNull(),
    modelName: text('model_name'),
    modelId: text('model_id'),
    originCountryCode: text('origin_country_code'),
    originCountryEtc: text('origin_country_etc'),
    taxType: text('tax_type'),
    adultProductType: text('adult_product_type'),

    // 중첩 구조 — 목록 검색 조건에 등장하지 않아 통째로 읽고 통째로 쓴다
    option: jsonb('option').$type<OptionCombination[]>(),
    subOption: jsonb('sub_option').$type<OptionCombination[]>(),
    keyWords: jsonb('key_words').$type<string[]>(),
    informationDisclosure: jsonb('information_disclosure').$type<ProductInformationDisclosure>().notNull(),
  },
  (table) => [
    // 고객사 상품코드는 워크스페이스 안에서 공백·대소문자를 무시하고 유일하다. 빈 값은 조건에서 뺀다.
    // 조건을 IS NOT NULL로 두지 않는 이유: 이 인덱스가 먼저 반영되고 새 코드가 늦게 배포되는 동안
    // 기존 코드가 빈 코드를 ''로 저장하므로, 코드 없는 상품의 두 번째 등록이 500이 된다.
    uniqueIndex(CUSTOMER_CODE_UNIQUE_INDEX)
      .on(table.ownerId, sql`lower(btrim(${table.customerCode}))`)
      .where(sql`btrim(${table.customerCode}) <> ''`),
  ],
);

export const shoppingAccounts = pgTable('shopping_accounts', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),

  mallCode: text('mall_code').notNull(),
  mallId: text('mall_id').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  nickname: text('nickname').notNull().default(''),
  managerMd: text('manager_md').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  domain: text('domain').notNull().default(''),
  category: text('category').notNull().default(''),

  // 브라우저로 내려보내지 않는다. 외부몰 전송(실행 순서 4)에서 서버가 읽어 쓴다.
  // 읽기 경로는 SHOPPING_ACCOUNT_PUBLIC_COLUMNS만 통과하므로 여기 있는 것만으로는 새지 않는다.
  password: text('password').notNull(),
  apiKey: text('api_key').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const shoppingSettings = pgTable('shopping_settings', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),

  mallAccountId: text('mall_account_id').notNull(),
  mallCode: text('mall_code').notNull(),
  // shopping_accounts.mallId의 사본이다. 쓰기 때 서버가 계정에서 읽어 채우고,
  // 계정이 수정되면 syncSettingMallId가 따라 고친다(Task 11).
  mallId: text('mall_id').notNull(),
  nickname: text('nickname').notNull().default(''),
  isActive: boolean('is_active').notNull().default(true),
  productCondition: text('product_condition').notNull(),
  salesPeriod: integer('sales_period').notNull(),
  // DELIVERY_COMPANY의 id. 쓰기 스키마가 필수로 요구하고, 기본값 ''은 이 컬럼 추가 전에 만들어진 행용이다.
  // ''이 남은 행으로 네이버에 보내면 시뮬레이터가 REQUIRED로 거절한다 — 조용히 넘어가지 않는다.
  deliveryCompany: text('delivery_company').notNull().default(''),

  // 검색 조건에 등장하지 않아 통째로 읽고 통째로 쓴다.
  // 폼을 거치는 쓰기 경로(shoppingSettingWriteSchema)는 주소를 필수로 요구한다. 컬럼을
  // nullable로 두는 이유는 그 경로를 거치지 않고 만들어졌거나 만들어질 수 있는 행 때문이다 —
  // 지금 이 컬럼이 null인 기존 행이 있다는 뜻은 아니다.
  shippingAddress: jsonb('shipping_address').$type<MallAddress>(),
  returnAddress: jsonb('return_address').$type<MallAddress>(),
  mallSettings: jsonb('mall_settings').$type<NaverSettingAttributes | KakaoSettingAttributes>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * 쇼핑몰 연동 데이터. 오리지널 상품·설정과 동기화되지 않는 독립 데이터다(domain-design.md).
 *
 * - mall_code·mall_account_id·mall_id는 불변이다. 수정 route의 UPDATE 문에 넣지 않는 것으로 지킨다.
 * - source_*에 FK를 걸지 않는다. RESTRICT는 오리지널 삭제를 막고 CASCADE는 연동을 지운다 — 둘 다 규칙 위반이다.
 * - 상품 스냅샷은 jsonb 통째다. 컬럼으로 펴면 Product 필드가 늘 때마다 두 테이블을 함께 마이그레이션해야 한다.
 *   검색에 쓰는 두 값만 생성 컬럼으로 뽑는다 — DB가 파생을 강제하므로 스냅샷과 갈라질 수 없다.
 */
export const mallLinkedProducts = pgTable(
  'mall_linked_products',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),

    mallCode: text('mall_code').notNull(),
    mallAccountId: text('mall_account_id').notNull(),
    mallId: text('mall_id').notNull(),

    sourceProductId: text('source_product_id').notNull(),
    sourceShoppingSettingId: text('source_shopping_setting_id').notNull(),

    status: text('status').$type<MallLinkStatus>().notNull(),
    externalProductId: text('external_product_id'),
    errorMessage: text('error_message'),

    productSnapshot: jsonb('product_snapshot').$type<Product>().notNull(),
    productName: text('product_name').generatedAlwaysAs(sql`(product_snapshot->>'name')`),
    productState: text('product_state').generatedAlwaysAs(sql`(product_snapshot->>'state')`),
    settingSnapshot: jsonb('setting_snapshot').$type<StoredSettingSnapshot>().notNull(),

    createdByEmail: text('created_by_email').notNull(),
    updatedByEmail: text('updated_by_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    lastSentAt: timestamp('last_sent_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('mall_linked_products_owner_last_sent_idx').on(table.ownerId, table.lastSentAt.desc())],
);

/** 전송·재전송 1회당 1행. 연동 건에 종속된 기록이라 source_*와 달리 FK + CASCADE가 맞다. */
export const mallLinkedProductHistories = pgTable(
  'mall_linked_product_histories',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    linkedProductId: text('linked_product_id').notNull(),
    ownerId: text('owner_id').notNull(),
    action: text('action').$type<MallLinkSendAction>().notNull(),
    status: text('status').$type<MallLinkStatus>().notNull(),
    externalProductId: text('external_product_id'),
    errorMessage: text('error_message'),
    source: text('source').$type<MallLinkSendSource>().notNull(),
    sentByEmail: text('sent_by_email').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // 자동 생성 이름이 Postgres 식별자 한도(63자)를 넘어 잘리면 push마다 FK를 다시 만든다 — 이름을 직접 준다.
    foreignKey({
      name: 'mall_linked_product_histories_linked_fk',
      columns: [table.linkedProductId],
      foreignColumns: [mallLinkedProducts.id],
    }).onDelete('cascade'),
    index('mall_linked_product_histories_linked_sent_idx').on(table.linkedProductId, table.sentAt.desc()),
  ],
);

const tz = { withTimezone: true } as const;

/**
 * 주문. 입구는 API 수집과 엑셀 등록 둘이다(domain-design.md) — 엑셀 주문에는 수집 작업·쇼핑몰계정이 없을 수 있어
 * 둘 다 FK를 걸지 않는다.
 * ① 몰 원본(shop_order_number ~ collected_at)은 수정 route의 SET에 없다(orderWrite.ts buildOrderUpdate).
 */
export const orders = pgTable(
  'orders',
  {
    orderNumber: text('order_number').primaryKey(),
    ownerId: text('owner_id').notNull(),

    shopOrderNumber: text('shop_order_number').notNull(),
    mallCode: text('mall_code').$type<ShoppingMalls>().notNull(),
    mallId: text('mall_id').notNull(),
    shopProductId: text('shop_product_id').notNull(),
    orderProductName: text('order_product_name').notNull(),
    orderPrice: integer('order_price').notNull(),
    orderTotalQuantity: integer('order_total_quantity').notNull(),
    orderOption: text('order_option'),
    orderSubOption: text('order_sub_option'),
    orderSubTotalQuantity: text('order_sub_total_quantity'),
    orderDeliveryType: text('order_delivery_type').$type<DeliveryTypeId>().notNull(),
    orderDeliveryPrice: integer('order_delivery_price').notNull(),
    paymentDate: timestamp('payment_date', tz).notNull(),
    collectedAt: timestamp('collected_at', tz).notNull(),

    orderName: text('order_name').notNull(),
    orderPhoneNumber: text('order_phone_number').notNull(),
    orderZipCode: text('order_zip_code').notNull(),
    orderAddress: text('order_address').notNull(),
    orderDetailAddress: text('order_detail_address'),
    payeeName: text('payee_name').notNull(),
    payeePhoneNumber: text('payee_phone_number').notNull(),
    payeeZipCode: text('payee_zip_code').notNull(),
    payeeAddress: text('payee_address').notNull(),
    payeeDetailAddress: text('payee_detail_address'),
    deliveryMessage: text('delivery_message'),

    orderStatus: text('order_status').$type<OrderStatusTypes>().notNull(),
    deliveryCompany: text('delivery_company'),
    invoiceNumber: text('invoice_number'),
    invoiceRegisteredAt: timestamp('invoice_registered_at', tz),
    invoiceSentAt: timestamp('invoice_sent_at', tz),

    // 수집에 쓴 쇼핑몰계정. FK가 아니다 — 계정을 삭제해도 주문은 남는다. null = 계정 없는 주문(시드·엑셀) → 몰 호출 없이 처리.
    shoppingAccountId: text('shopping_account_id'),
    // 마지막으로 실패한 몰 연동과 사유. 같은 동작이 성공하면 비운다(다른 동작의 사유는 남긴다).
    mallSyncAction: text('mall_sync_action').$type<MallSyncAction>(),
    mallSyncError: text('mall_sync_error'),
  },
  (table) => [
    index('orders_owner_collected_idx').on(table.ownerId, table.collectedAt.desc()),
    // 수집 중복 판정 키(스펙 §1). 빈 번호(API 없는 몰의 엑셀 주문)는 비교하지 않는다 — ON CONFLICT도 같은 WHERE를 붙인다.
    uniqueIndex('orders_owner_mall_shop_order_unique')
      .on(table.ownerId, table.mallCode, table.shopOrderNumber)
      .where(sql`${table.shopOrderNumber} <> ''`),
  ],
);

/** 주문당 최대 1건(2026-09-30 결정). 여러 건이 필요해지면 유니크를 푼다. 주문에 종속된 기록이라 FK + CASCADE. */
export const orderClaims = pgTable(
  'order_claims',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderNumber: text('order_number').notNull(),
    ownerId: text('owner_id').notNull(),
    claimType: text('claim_type').$type<OrderClaimType>().notNull(),
    claimMessage: text('claim_message').notNull(),
    handlerNote: text('handler_note').notNull().default(''),
    createdAt: timestamp('created_at', tz).notNull(),
  },
  (table) => [
    uniqueIndex('order_claims_order_number_unique').on(table.orderNumber),
    foreignKey({
      name: 'order_claims_order_fk',
      columns: [table.orderNumber],
      foreignColumns: [orders.orderNumber],
    }).onDelete('cascade'),
  ],
);

export const orderComments = pgTable(
  'order_comments',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderNumber: text('order_number').notNull(),
    ownerId: text('owner_id').notNull(),
    content: text('content').notNull(),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    createdAt: timestamp('created_at', tz).notNull(),
  },
  (table) => [
    foreignKey({
      name: 'order_comments_order_fk',
      columns: [table.orderNumber],
      foreignColumns: [orders.orderNumber],
    }).onDelete('cascade'),
    index('order_comments_order_created_idx').on(table.orderNumber, table.createdAt),
  ],
);

/** 주문 수정 1회당 1행. changed_fields는 필드 키 배열(클레임 메모는 'claim.handlerNote'). */
export const orderEditHistories = pgTable(
  'order_edit_histories',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderNumber: text('order_number').notNull(),
    ownerId: text('owner_id').notNull(),
    changedFields: jsonb('changed_fields').$type<string[]>().notNull(),
    modifiedByName: text('modified_by_name').notNull(),
    modifiedByEmail: text('modified_by_email').notNull(),
    modifiedAt: timestamp('modified_at', tz).notNull(),
    // 몰을 호출한 이력에만. 실패 이력은 changed_fields가 []이고 mall_error에 사유가 있다.
    mallAction: text('mall_action').$type<MallSyncAction>(),
    mallError: text('mall_error'),
  },
  (table) => [
    foreignKey({
      name: 'order_edit_histories_order_fk',
      columns: [table.orderNumber],
      foreignColumns: [orders.orderNumber],
    }).onDelete('cascade'),
    index('order_edit_histories_order_modified_idx').on(table.orderNumber, table.modifiedAt),
  ],
);

/**
 * 계정당 마지막 수집 결과 1행. 행이 없으면 수집한 적 없음(화면 WAITING).
 * 계정이 지워지면 수집 기록도 의미가 없어 CASCADE.
 */
export const orderCollections = pgTable('order_collections', {
  shoppingAccountId: text('shopping_account_id')
    .primaryKey()
    .references(() => shoppingAccounts.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').notNull(),
  status: text('status').$type<CollectionResultStatus>().notNull(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  newCount: integer('new_count').notNull(),
  duplicateCount: integer('duplicate_count').notNull(),
  errorMessage: text('error_message'),
  collectedAt: timestamp('collected_at', tz).notNull(),
  // 값 복사(FK 아님) — 사용자가 삭제·개명돼도 그때의 실행자가 남는다(수정 이력과 같은 이유).
  collectedByName: text('collected_by_name').notNull(),
  collectedByEmail: text('collected_by_email').notNull(),
  // 네이버 외 몰 무작위 생성 기준 시각. 네이버는 시뮬레이터가 자체 관리한다.
  generatedAt: timestamp('generated_at', tz),
});
