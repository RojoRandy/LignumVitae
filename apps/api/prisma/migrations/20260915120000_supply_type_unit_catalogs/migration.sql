BEGIN;

-- 1. Create catalogs.
CREATE TABLE "inventory"."supply_types" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "supply_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory"."units_of_measure" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- 2. Seed the system rows exactly as specified in A1.
INSERT INTO "inventory"."supply_types" ("slug", "name", "sort_order", "is_system", "updated_at") VALUES
    ('WAX', 'Cera', 10, true, CURRENT_TIMESTAMP),
    ('FRAGRANCE', 'Aroma', 20, true, CURRENT_TIMESTAMP),
    ('WICK', 'Mecha', 30, true, CURRENT_TIMESTAMP),
    ('DYE', 'Colorante', 40, true, CURRENT_TIMESTAMP),
    ('ALUMINUM_BASE', 'Base de aluminio', 50, true, CURRENT_TIMESTAMP),
    ('CELLOPHANE', 'Celofan', 60, true, CURRENT_TIMESTAMP),
    ('RIBBON', 'Liston', 70, true, CURRENT_TIMESTAMP),
    ('LABEL', 'Etiqueta', 80, true, CURRENT_TIMESTAMP),
    ('PRINTING', 'Impresion', 90, true, CURRENT_TIMESTAMP),
    ('SEAL', 'Sello', 100, true, CURRENT_TIMESTAMP),
    ('BELL', 'Cascabel', 110, true, CURRENT_TIMESTAMP),
    ('SILICONE', 'Silicon', 120, true, CURRENT_TIMESTAMP),
    ('BOX', 'Caja', 130, true, CURRENT_TIMESTAMP),
    ('TULLE', 'Tul', 140, true, CURRENT_TIMESTAMP),
    ('ACETATE', 'Acetato', 150, true, CURRENT_TIMESTAMP),
    ('PAPER', 'Papel', 160, true, CURRENT_TIMESTAMP),
    ('OTHER', 'Otro', 170, true, CURRENT_TIMESTAMP);

INSERT INTO "inventory"."units_of_measure" ("slug", "name", "abbr", "sort_order", "is_system", "updated_at") VALUES
    ('GRAM', 'Gramo', 'g', 10, true, CURRENT_TIMESTAMP),
    ('KILOGRAM', 'Kilogramo', 'kg', 20, true, CURRENT_TIMESTAMP),
    ('MILLILITER', 'Mililitro', 'ml', 30, true, CURRENT_TIMESTAMP),
    ('LITER', 'Litro', 'l', 40, true, CURRENT_TIMESTAMP),
    ('CENTIMETER', 'Centimetro', 'cm', 50, true, CURRENT_TIMESTAMP),
    ('METER', 'Metro', 'm', 60, true, CURRENT_TIMESTAMP),
    ('PIECE', 'Pieza', 'pz', 70, true, CURRENT_TIMESTAMP),
    ('SHEET', 'Pliego', 'pliegos', 80, true, CURRENT_TIMESTAMP);

-- 3. Add nullable foreign key columns.
ALTER TABLE "inventory"."supplies" ADD COLUMN "type_id" INTEGER;
ALTER TABLE "inventory"."supplies" ADD COLUMN "unit_id" INTEGER;
ALTER TABLE "catalog"."product_supplies" ADD COLUMN "unit_id" INTEGER;
ALTER TABLE "catalog"."candle_supply_templates" ADD COLUMN "unit_id" INTEGER;
ALTER TABLE "catalog"."packaging_supply_templates" ADD COLUMN "unit_id" INTEGER;
ALTER TABLE "catalog"."card_supply_templates" ADD COLUMN "unit_id" INTEGER;

-- 4. Backfill each original value by its identical slug.
UPDATE "inventory"."supplies" SET "type_id" = (SELECT "id" FROM "inventory"."supply_types" WHERE "slug" = "type"::text);
UPDATE "inventory"."supplies" SET "unit_id" = (SELECT "id" FROM "inventory"."units_of_measure" WHERE "slug" = "unit"::text);
UPDATE "catalog"."product_supplies" SET "unit_id" = (SELECT "id" FROM "inventory"."units_of_measure" WHERE "slug" = "unit"::text);
UPDATE "catalog"."candle_supply_templates" SET "unit_id" = (SELECT "id" FROM "inventory"."units_of_measure" WHERE "slug" = "unit"::text);
UPDATE "catalog"."packaging_supply_templates" SET "unit_id" = (SELECT "id" FROM "inventory"."units_of_measure" WHERE "slug" = "unit"::text);
UPDATE "catalog"."card_supply_templates" SET "unit_id" = (SELECT "id" FROM "inventory"."units_of_measure" WHERE "slug" = "unit"::text);

-- 5. Abort the entire migration if any value has no catalog match.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "inventory"."supplies" WHERE "type_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: inventory.supplies.type_id contains NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM "inventory"."supplies" WHERE "unit_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: inventory.supplies.unit_id contains NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM "catalog"."product_supplies" WHERE "unit_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: catalog.product_supplies.unit_id contains NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM "catalog"."candle_supply_templates" WHERE "unit_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: catalog.candle_supply_templates.unit_id contains NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM "catalog"."packaging_supply_templates" WHERE "unit_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: catalog.packaging_supply_templates.unit_id contains NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM "catalog"."card_supply_templates" WHERE "unit_id" IS NULL) THEN
        RAISE EXCEPTION 'Backfill incomplete: catalog.card_supply_templates.unit_id contains NULL';
    END IF;
END $$;

-- 6. Require catalog references and create foreign keys and indexes.
CREATE UNIQUE INDEX "supply_types_slug_key" ON "inventory"."supply_types"("slug");
CREATE UNIQUE INDEX "supply_types_name_key" ON "inventory"."supply_types"("name");
CREATE UNIQUE INDEX "units_of_measure_slug_key" ON "inventory"."units_of_measure"("slug");
CREATE UNIQUE INDEX "units_of_measure_name_key" ON "inventory"."units_of_measure"("name");
ALTER TABLE "inventory"."supplies" ALTER COLUMN "type_id" SET NOT NULL;
ALTER TABLE "inventory"."supplies" ADD CONSTRAINT "supplies_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "inventory"."supply_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "supplies_type_id_idx" ON "inventory"."supplies"("type_id");
ALTER TABLE "inventory"."supplies" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "inventory"."supplies" ADD CONSTRAINT "supplies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory"."units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "supplies_unit_id_idx" ON "inventory"."supplies"("unit_id");
ALTER TABLE "catalog"."product_supplies" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "catalog"."product_supplies" ADD CONSTRAINT "product_supplies_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory"."units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "product_supplies_unit_id_idx" ON "catalog"."product_supplies"("unit_id");
ALTER TABLE "catalog"."candle_supply_templates" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "catalog"."candle_supply_templates" ADD CONSTRAINT "candle_supply_templates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory"."units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "candle_supply_templates_unit_id_idx" ON "catalog"."candle_supply_templates"("unit_id");
ALTER TABLE "catalog"."packaging_supply_templates" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "catalog"."packaging_supply_templates" ADD CONSTRAINT "packaging_supply_templates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory"."units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "packaging_supply_templates_unit_id_idx" ON "catalog"."packaging_supply_templates"("unit_id");
ALTER TABLE "catalog"."card_supply_templates" ALTER COLUMN "unit_id" SET NOT NULL;
ALTER TABLE "catalog"."card_supply_templates" ADD CONSTRAINT "card_supply_templates_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "inventory"."units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "card_supply_templates_unit_id_idx" ON "catalog"."card_supply_templates"("unit_id");

-- 7. Drop only the replaced columns and their obsolete enum types.
ALTER TABLE "inventory"."supplies" DROP COLUMN "type";
ALTER TABLE "inventory"."supplies" DROP COLUMN "unit";
ALTER TABLE "catalog"."product_supplies" DROP COLUMN "unit";
ALTER TABLE "catalog"."candle_supply_templates" DROP COLUMN "unit";
ALTER TABLE "catalog"."packaging_supply_templates" DROP COLUMN "unit";
ALTER TABLE "catalog"."card_supply_templates" DROP COLUMN "unit";
DROP TYPE "inventory"."supply_type";
DROP TYPE "inventory"."unit_of_measure";

COMMIT;
