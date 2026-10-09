-- AlterTable
ALTER TABLE "config"."settings" ADD COLUMN     "fragrance_drops_per_100g" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "fragrance_real_cost" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sales"."order_items" ADD COLUMN     "fragrance_ml_per_unit" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales"."quotation_items" ADD COLUMN     "fragrance_ml_per_unit" DECIMAL(10,4) NOT NULL DEFAULT 0;
