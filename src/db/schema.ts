import { pgTable, text } from 'drizzle-orm/pg-core';

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
