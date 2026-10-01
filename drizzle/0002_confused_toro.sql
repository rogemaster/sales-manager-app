CREATE TABLE "naver_product_orders" (
	"product_order_id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"product_no" bigint NOT NULL,
	"product_order_status" text NOT NULL,
	"place_order_status" text NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"last_changed_at" timestamp with time zone NOT NULL,
	"delivery_company" text,
	"tracking_number" text,
	"dispatched_at" timestamp with time zone,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "naver_sellers" ADD COLUMN "orders_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "naver_product_orders" ADD CONSTRAINT "naver_product_orders_product_no_naver_products_product_no_fk" FOREIGN KEY ("product_no") REFERENCES "public"."naver_products"("product_no") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "naver_product_orders_seller_changed_idx" ON "naver_product_orders" USING btree ("seller_id","last_changed_at","product_order_id");