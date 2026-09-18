-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN     "excluded_supply_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
