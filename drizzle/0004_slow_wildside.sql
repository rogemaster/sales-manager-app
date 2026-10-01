CREATE TABLE "order_collections" (
	"shopping_account_id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"status" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"new_count" integer NOT NULL,
	"duplicate_count" integer NOT NULL,
	"error_message" text,
	"collected_at" timestamp with time zone NOT NULL,
	"collected_by_name" text NOT NULL,
	"collected_by_email" text NOT NULL,
	"generated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "order_collections" ADD CONSTRAINT "order_collections_shopping_account_id_shopping_accounts_id_fk" FOREIGN KEY ("shopping_account_id") REFERENCES "public"."shopping_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_owner_mall_shop_order_unique" ON "orders" USING btree ("owner_id","mall_code","shop_order_number") WHERE "orders"."shop_order_number" <> '';