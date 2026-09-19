-- AlterTable
ALTER TABLE "inventory"."supplies" ADD COLUMN     "ask_in_quote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quote_field_label" TEXT,
ADD COLUMN     "quote_field_placeholder" TEXT;

-- AlterTable
ALTER TABLE "sales"."order_items" ADD COLUMN     "extra_fields" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "sales"."quotation_items" ADD COLUMN     "extra_fields" JSONB NOT NULL DEFAULT '[]';
