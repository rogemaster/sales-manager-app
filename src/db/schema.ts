import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { OptionCombination, ProductInformationDisclosure } from '@/features/products/types/product.types';

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

export const products = pgTable('products', {
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
   * R2 key(`images/<ownerId>/<uuid>.png`)와 절대 URL(엑셀·시드의 외부 이미지)이 함께 들어온다.
   * 이 합집합은 실수가 아니라 선택된 계약이다(스펙 4.2) — key로 통일하려 하지 말 것.
   * 표시 기능을 붙일 때는 두 형태를 가르는 URL 조립 함수를 반드시 거친다.
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
});
