CREATE TABLE "order_claims" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"owner_id" text NOT NULL,
	"claim_type" text NOT NULL,
	"claim_message" text NOT NULL,
	"handler_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"owner_id" text NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_edit_histories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"owner_id" text NOT NULL,
	"changed_fields" jsonb NOT NULL,
	"modified_by_name" text NOT NULL,
	"modified_by_email" text NOT NULL,
	"modified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_number" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shop_order_number" text NOT NULL,
	"mall_code" text NOT NULL,
	"mall_id" text NOT NULL,
	"shop_product_id" text NOT NULL,
	"order_product_name" text NOT NULL,
	"order_price" integer NOT NULL,
	"order_total_quantity" integer NOT NULL,
	"order_option" text,
	"order_sub_option" text,
	"order_sub_total_quantity" text,
	"order_delivery_type" text NOT NULL,
	"order_delivery_price" integer NOT NULL,
	"payment_date" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"order_name" text NOT NULL,
	"order_phone_number" text NOT NULL,
	"order_zip_code" text NOT NULL,
	"order_address" text NOT NULL,
	"order_detail_address" text,
	"payee_name" text NOT NULL,
	"payee_phone_number" text NOT NULL,
	"payee_zip_code" text NOT NULL,
	"payee_address" text NOT NULL,
	"payee_detail_address" text,
	"delivery_message" text,
	"order_status" text NOT NULL,
	"delivery_company" text,
	"invoice_number" text,
	"invoice_registered_at" timestamp with time zone,
	"invoice_sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_claims" ADD CONSTRAINT "order_claims_order_fk" FOREIGN KEY ("order_number") REFERENCES "public"."orders"("order_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_comments" ADD CONSTRAINT "order_comments_order_fk" FOREIGN KEY ("order_number") REFERENCES "public"."orders"("order_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_edit_histories" ADD CONSTRAINT "order_edit_histories_order_fk" FOREIGN KEY ("order_number") REFERENCES "public"."orders"("order_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "order_claims_order_number_unique" ON "order_claims" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "order_comments_order_created_idx" ON "order_comments" USING btree ("order_number","created_at");--> statement-breakpoint
CREATE INDEX "order_edit_histories_order_modified_idx" ON "order_edit_histories" USING btree ("order_number","modified_at");--> statement-breakpoint
CREATE INDEX "orders_owner_collected_idx" ON "orders" USING btree ("owner_id","collected_at" DESC NULLS LAST);