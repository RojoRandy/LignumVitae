-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN     "retail_margin_pct" DECIMAL(7,2) NOT NULL DEFAULT 0,
ADD COLUMN     "wholesale_margin_pct" DECIMAL(7,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_retail_margin_pct_idx" ON "catalog"."products"("retail_margin_pct");

-- CreateIndex
CREATE INDEX "products_wholesale_margin_pct_idx" ON "catalog"."products"("wholesale_margin_pct");

-- CreateFunction
CREATE OR REPLACE FUNCTION "catalog"."products_set_margin"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.retail_margin_pct := CASE
        WHEN COALESCE(NEW.retail_price_override, NEW.retail_list_price) > 0
        THEN GREATEST(-99999.99, LEAST(99999.99, ROUND(
            (COALESCE(NEW.retail_price_override, NEW.retail_list_price) - NEW.unit_total_cost)
            / COALESCE(NEW.retail_price_override, NEW.retail_list_price) * 100, 2
        )))
        ELSE 0
    END;
    NEW.wholesale_margin_pct := CASE
        WHEN COALESCE(NEW.wholesale_price_override, NEW.wholesale_list_price) > 0
        THEN GREATEST(-99999.99, LEAST(99999.99, ROUND(
            (COALESCE(NEW.wholesale_price_override, NEW.wholesale_list_price) - NEW.unit_total_cost)
            / COALESCE(NEW.wholesale_price_override, NEW.wholesale_list_price) * 100, 2
        )))
        ELSE 0
    END;
    RETURN NEW;
END;
$$;

-- CreateTrigger
CREATE TRIGGER "products_set_margin" BEFORE INSERT OR UPDATE ON "catalog"."products"
FOR EACH ROW EXECUTE FUNCTION "catalog"."products_set_margin"();

-- Backfill
UPDATE "catalog"."products" SET "id" = "id";
