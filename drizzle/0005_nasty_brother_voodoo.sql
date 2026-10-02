ALTER TABLE "order_edit_histories" ADD COLUMN "mall_action" text;--> statement-breakpoint
ALTER TABLE "order_edit_histories" ADD COLUMN "mall_error" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shopping_account_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mall_sync_action" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "mall_sync_error" text;