import { sql } from 'drizzle-orm';
import { pgTable, text, integer, jsonb, timestamp, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import type { OptionCombination, ProductInformationDisclosure } from '@/features/products/types/product.types';
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
