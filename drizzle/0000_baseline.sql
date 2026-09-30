CREATE TABLE "mall_linked_product_histories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"linked_product_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"action" text NOT NULL,
	"status" text NOT NULL,
	"external_product_id" text,
	"error_message" text,
	"source" text NOT NULL,
	"sent_by_email" text NOT NULL,
	"sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mall_linked_products" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"mall_code" text NOT NULL,
	"mall_account_id" text NOT NULL,
	"mall_id" text NOT NULL,
	"source_product_id" text NOT NULL,
	"source_shopping_setting_id" text NOT NULL,
	"status" text NOT NULL,
	"external_product_id" text,
	"error_message" text,
	"product_snapshot" jsonb NOT NULL,
	"product_name" text GENERATED ALWAYS AS ((product_snapshot->>'name')) STORED,
	"product_state" text GENERATED ALWAYS AS ((product_snapshot->>'state')) STORED,
	"setting_snapshot" jsonb NOT NULL,
	"created_by_email" text NOT NULL,
	"updated_by_email" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"category_id" text NOT NULL,
	"state" text NOT NULL,
	"create_date" timestamp with time zone NOT NULL,
	"update_date" timestamp with time zone NOT NULL,
	"customer_code" text,
	"price" integer NOT NULL,
	"net_price" integer,
	"delivery_type" text NOT NULL,
	"delivery_price" integer NOT NULL,
	"total_quantity" integer NOT NULL,
	"main_image" text NOT NULL,
	"detail_page" text NOT NULL,
	"brand" text NOT NULL,
	"manufacturer" text NOT NULL,
	"model_name" text,
	"model_id" text,
	"origin_country_code" text,
	"origin_country_etc" text,
	"tax_type" text,
	"adult_product_type" text,
	"option" jsonb,
	"sub_option" jsonb,
	"key_words" jsonb,
	"information_disclosure" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"mall_code" text NOT NULL,
	"mall_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"manager_md" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"password" text NOT NULL,
	"api_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"mall_account_id" text NOT NULL,
	"mall_code" text NOT NULL,
	"mall_id" text NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"product_condition" text NOT NULL,
	"sales_period" integer NOT NULL,
	"delivery_company" text DEFAULT '' NOT NULL,
	"shipping_address" jsonb,
	"return_address" jsonb,
	"mall_settings" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"avatar" text,
	"phone" text DEFAULT '' NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"company" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"grade" text DEFAULT 'super_admin' NOT NULL,
	"representative_name" text DEFAULT '' NOT NULL,
	"business_number" text DEFAULT '' NOT NULL,
	"business_category" text DEFAULT '' NOT NULL,
	"business_license_name" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"settlement_name" text DEFAULT '' NOT NULL,
	"settlement_email" text DEFAULT '' NOT NULL,
	"settlement_phone" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "naver_addresses" (
	"address_id" text PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"address_type" text NOT NULL,
	"name" text NOT NULL,
	"zip_code" text NOT NULL,
	"address" text NOT NULL,
	"address_detail" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naver_products" (
	"product_no" bigserial PRIMARY KEY NOT NULL,
	"seller_id" text NOT NULL,
	"name" text NOT NULL,
	"status_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "naver_sellers" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "naver_sellers_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
ALTER TABLE "mall_linked_product_histories" ADD CONSTRAINT "mall_linked_product_histories_linked_fk" FOREIGN KEY ("linked_product_id") REFERENCES "public"."mall_linked_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mall_linked_product_histories_linked_sent_idx" ON "mall_linked_product_histories" USING btree ("linked_product_id","sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "mall_linked_products_owner_last_sent_idx" ON "mall_linked_products" USING btree ("owner_id","last_sent_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "products_owner_customer_code_unique" ON "products" USING btree ("owner_id",lower(btrim("customer_code"))) WHERE btrim("products"."customer_code") <> '';--> statement-breakpoint
CREATE UNIQUE INDEX "naver_products_seller_name_unique" ON "naver_products" USING btree ("seller_id",lower(btrim("name")));