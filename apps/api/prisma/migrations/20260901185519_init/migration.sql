-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "config";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sales";

-- CreateEnum
CREATE TYPE "auth"."user_roles" AS ENUM ('employee', 'admin', 'super_user');

-- CreateEnum
CREATE TYPE "catalog"."product_kind" AS ENUM ('SIMPLE', 'BOUQUET');

-- CreateEnum
CREATE TYPE "catalog"."supply_source" AS ENUM ('PACKAGING_TEMPLATE', 'CARD_TEMPLATE', 'MANUAL');

-- CreateEnum
CREATE TYPE "inventory"."supply_type" AS ENUM ('WAX', 'FRAGRANCE', 'WICK', 'DYE', 'ALUMINUM_BASE', 'CELLOPHANE', 'RIBBON', 'LABEL', 'PRINTING', 'SEAL', 'BELL', 'SILICONE', 'BOX', 'TULLE', 'ACETATE', 'PAPER', 'OTHER');

-- CreateEnum
CREATE TYPE "inventory"."unit_of_measure" AS ENUM ('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'CENTIMETER', 'METER', 'PIECE', 'SHEET');

-- CreateEnum
CREATE TYPE "inventory"."stock_movement_kind" AS ENUM ('PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTE');

-- CreateEnum
CREATE TYPE "inventory"."purchase_line_kind" AS ENUM ('SUPPLY', 'ASSET', 'EXPENSE');

-- CreateEnum
CREATE TYPE "inventory"."asset_kind" AS ENUM ('MOLD', 'TOOL', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "inventory"."expense_kind" AS ENUM ('OVERHEAD', 'NON_OPERATING');

-- CreateEnum
CREATE TYPE "inventory"."expense_source" AS ENUM ('MANUAL', 'PURCHASE', 'DEPRECIATION');

-- CreateEnum
CREATE TYPE "sales"."quotation_status" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "sales"."order_status" AS ENUM ('PENDING_DEPOSIT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "sales"."price_tier" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "sales"."payment_method" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "sales"."adjustment_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "sales"."quote_request_status" AS ENUM ('NEW', 'CONVERTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "config"."overhead_rate_mode" AS ENUM ('DERIVED', 'FIXED');

-- CreateTable
CREATE TABLE "auth"."users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "auth"."user_roles" NOT NULL DEFAULT 'employee',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."candle_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL DEFAULT '#7A5C3E',
    "description" TEXT,
    "cover_image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_visible_on_landing" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candle_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."candles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "grams" DECIMAL(10,2) NOT NULL,
    "width_cm" DECIMAL(6,2),
    "height_cm" DECIMAL(6,2),
    "waste_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "melt_minutes" INTEGER NOT NULL DEFAULT 15,
    "melt_batch_grams" INTEGER,
    "wax_supply_id" INTEGER,
    "mold_asset_id" INTEGER,
    "imageUrl" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."packaging_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "pack_minutes" INTEGER NOT NULL DEFAULT 0,
    "setup_minutes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packaging_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."card_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "width_cm" DECIMAL(6,2),
    "height_cm" DECIMAL(6,2),
    "printed_sides" INTEGER NOT NULL DEFAULT 1,
    "setup_minutes" INTEGER NOT NULL DEFAULT 15,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."packaging_supply_templates" (
    "id" SERIAL NOT NULL,
    "packaging_type_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" "inventory"."unit_of_measure" NOT NULL,
    "note" TEXT,

    CONSTRAINT "packaging_supply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."card_supply_templates" (
    "id" SERIAL NOT NULL,
    "card_type_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" "inventory"."unit_of_measure" NOT NULL,
    "note" TEXT,

    CONSTRAINT "card_supply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."products" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "catalog"."product_kind" NOT NULL DEFAULT 'SIMPLE',
    "category_id" INTEGER NOT NULL,
    "candle_id" INTEGER,
    "packaging_type_id" INTEGER,
    "card_type_id" INTEGER,
    "description" TEXT,
    "extra_setup_minutes" INTEGER NOT NULL DEFAULT 0,
    "extra_pack_minutes" INTEGER NOT NULL DEFAULT 0,
    "assembly_minutes" INTEGER NOT NULL DEFAULT 0,
    "allows_fragrance" BOOLEAN NOT NULL DEFAULT true,
    "unit_wax_cost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "unit_supply_cost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "unit_labor_cost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "unit_overhead_cost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "unit_total_cost" DECIMAL(14,6) NOT NULL DEFAULT 0,
    "retail_list_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "wholesale_list_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "retail_price_override" DECIMAL(12,2),
    "wholesale_price_override" DECIMAL(12,2),
    "costing_basis" JSONB,
    "costing_computed_at" TIMESTAMP(3),
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "review_note" TEXT,
    "is_visible_on_landing" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."product_components" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "candle_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."product_supplies" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" "inventory"."unit_of_measure" NOT NULL,
    "source" "catalog"."supply_source" NOT NULL DEFAULT 'MANUAL',
    "note" TEXT,

    CONSTRAINT "product_supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."supplies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "type" "inventory"."supply_type" NOT NULL,
    "unit" "inventory"."unit_of_measure" NOT NULL,
    "current_unit_cost" DECIMAL(14,6) NOT NULL,
    "suggested_unit_cost" DECIMAL(14,6),
    "suggested_cost_sample_size" INTEGER NOT NULL DEFAULT 0,
    "suggested_cost_computed_at" TIMESTAMP(3),
    "stock_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "min_stock_qty" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "default_pack_label" TEXT,
    "default_base_qty_per_pack" DECIMAL(14,3),
    "yield_per_base_unit" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."stock_movements" (
    "id" SERIAL NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "kind" "inventory"."stock_movement_kind" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_cost" DECIMAL(14,6) NOT NULL,
    "ref_type" TEXT,
    "ref_id" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."purchases" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "purchased_at" DATE NOT NULL,
    "platform" TEXT,
    "supplier_name" TEXT,
    "reference" TEXT,
    "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."purchase_items" (
    "id" SERIAL NOT NULL,
    "purchase_id" INTEGER NOT NULL,
    "kind" "inventory"."purchase_line_kind" NOT NULL,
    "description" TEXT NOT NULL,
    "supply_id" INTEGER,
    "asset_id" INTEGER,
    "expense_category_id" INTEGER,
    "packs_qty" DECIMAL(14,3) NOT NULL,
    "base_qty_per_pack" DECIMAL(14,3) NOT NULL,
    "price_per_pack" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "base_quantity" DECIMAL(14,3) NOT NULL,
    "base_unit_cost" DECIMAL(14,6) NOT NULL,
    "landed_unit_cost" DECIMAL(14,6) NOT NULL,
    "allocated_shipping" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."assets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "inventory"."asset_kind" NOT NULL DEFAULT 'MOLD',
    "acquired_at" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(12,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "salvage_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "useful_life_months" INTEGER NOT NULL DEFAULT 24,
    "retired_at" DATE,
    "imageUrl" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."expense_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "inventory"."expense_kind" NOT NULL DEFAULT 'OVERHEAD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."expenses" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "source" "inventory"."expense_source" NOT NULL DEFAULT 'MANUAL',
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "period_month" DATE NOT NULL,
    "incurred_at" DATE NOT NULL,
    "ref_type" TEXT,
    "ref_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."overhead_periods" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "expense_total" DECIMAL(12,2) NOT NULL,
    "produced_minutes" DECIMAL(14,3) NOT NULL,
    "produced_units" INTEGER NOT NULL,
    "produced_grams" DECIMAL(14,3) NOT NULL,
    "rate_per_minute" DECIMAL(14,6) NOT NULL,
    "rate_source" TEXT NOT NULL,
    "rate_per_unit" DECIMAL(14,6) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overhead_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."customers" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."quote_requests" (
    "id" SERIAL NOT NULL,
    "status" "sales"."quote_request_status" NOT NULL DEFAULT 'NEW',
    "full_name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "event_date" DATE,
    "due_date" DATE,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "converted_quotation_id" INTEGER,
    "dismissed_reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."quotations" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "status" "sales"."quotation_status" NOT NULL DEFAULT 'DRAFT',
    "customer_id" INTEGER NOT NULL,
    "created_by_id" INTEGER,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "event_date" DATE,
    "wax_unit_cost" DECIMAL(14,6) NOT NULL,
    "labor_rate_per_minute" DECIMAL(14,6) NOT NULL,
    "overhead_rate_per_minute" DECIMAL(14,6) NOT NULL,
    "melt_batch_grams" INTEGER NOT NULL,
    "retail_markup_pct" DECIMAL(5,2) NOT NULL,
    "wholesale_markup_pct" DECIMAL(5,2) NOT NULL,
    "wholesale_threshold_qty" INTEGER NOT NULL,
    "fragrance_surcharge" DECIMAL(12,2) NOT NULL,
    "rounding_multiple" DECIMAL(12,2) NOT NULL,
    "deposit_pct" DECIMAL(5,2) NOT NULL,
    "price_tier" "sales"."price_tier" NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "total_wax_grams" DECIMAL(14,3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_enabled" BOOLEAN NOT NULL DEFAULT false,
    "discount_type" "sales"."adjustment_type" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "gross_profit" DECIMAL(12,2) NOT NULL,
    "gross_margin_pct" DECIMAL(5,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "notes" TEXT,
    "terms" TEXT,
    "public_token" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."quotation_items" (
    "id" SERIAL NOT NULL,
    "quotation_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "candle_color" TEXT,
    "ribbon_color" TEXT,
    "with_fragrance" BOOLEAN NOT NULL DEFAULT false,
    "fragrance_name" TEXT,
    "personalization_text" TEXT,
    "setup_minutes_override" INTEGER,
    "wax_grams_per_unit" DECIMAL(10,3) NOT NULL,
    "labor_minutes_per_unit" DECIMAL(10,4) NOT NULL,
    "unit_wax_cost" DECIMAL(14,6) NOT NULL,
    "unit_supply_cost" DECIMAL(14,6) NOT NULL,
    "unit_fragrance_cost" DECIMAL(14,6) NOT NULL,
    "unit_labor_cost" DECIMAL(14,6) NOT NULL,
    "unit_overhead_cost" DECIMAL(14,6) NOT NULL,
    "unit_total_cost" DECIMAL(14,6) NOT NULL,
    "unit_list_price" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "price_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "line_cost" DECIMAL(12,2) NOT NULL,
    "line_margin" DECIMAL(12,2) NOT NULL,
    "supplies_snapshot" JSONB NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."orders" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "quotation_id" INTEGER,
    "customer_id" INTEGER NOT NULL,
    "status" "sales"."order_status" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "order_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "delivered_at" DATE,
    "cancelled_at" TIMESTAMP(3),
    "price_tier" "sales"."price_tier" NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "total_wax_grams" DECIMAL(14,3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "total_supply_cost" DECIMAL(12,2) NOT NULL,
    "total_labor_cost" DECIMAL(12,2) NOT NULL,
    "total_overhead_cost" DECIMAL(12,2) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "gross_profit" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "snapshot" JSONB NOT NULL,
    "notes" TEXT,
    "created_by_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "product_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "candle_color" TEXT,
    "ribbon_color" TEXT,
    "with_fragrance" BOOLEAN NOT NULL DEFAULT false,
    "fragrance_name" TEXT,
    "personalization_text" TEXT,
    "wax_grams_per_unit" DECIMAL(10,3) NOT NULL,
    "labor_minutes_per_unit" DECIMAL(10,4) NOT NULL,
    "unit_wax_cost" DECIMAL(14,6) NOT NULL,
    "unit_supply_cost" DECIMAL(14,6) NOT NULL,
    "unit_fragrance_cost" DECIMAL(14,6) NOT NULL,
    "unit_labor_cost" DECIMAL(14,6) NOT NULL,
    "unit_overhead_cost" DECIMAL(14,6) NOT NULL,
    "unit_total_cost" DECIMAL(14,6) NOT NULL,
    "unit_list_price" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "price_variance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "line_cost" DECIMAL(12,2) NOT NULL,
    "line_margin" DECIMAL(12,2) NOT NULL,
    "supplies_snapshot" JSONB NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."payments" (
    "id" SERIAL NOT NULL,
    "folio" TEXT NOT NULL,
    "order_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "sales"."payment_method" NOT NULL DEFAULT 'TRANSFER',
    "is_deposit" BOOLEAN NOT NULL DEFAULT false,
    "reference" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "received_by_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales"."folio_counters" (
    "scope" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "folio_counters_pkey" PRIMARY KEY ("scope","year")
);

-- CreateTable
CREATE TABLE "config"."settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "legal_name" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL DEFAULT 'Lignum Vitae',
    "logo_url" TEXT,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "business_hours" TEXT NOT NULL,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "tiktok_url" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City',
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "min_lead_time_days" INTEGER NOT NULL DEFAULT 7,
    "deposit_pct" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "quotation_validity_days" INTEGER NOT NULL DEFAULT 7,
    "daily_wage" DECIMAL(12,2) NOT NULL DEFAULT 278,
    "work_hours_per_day" INTEGER NOT NULL DEFAULT 8,
    "melt_batch_grams" INTEGER NOT NULL DEFAULT 4000,
    "default_waste_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.03,
    "wax_supply_id" INTEGER,
    "fragrance_supply_id" INTEGER,
    "fragrance_load_pct" DECIMAL(5,4) NOT NULL DEFAULT 0.08,
    "fragrance_surcharge" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    "overhead_rate_mode" "config"."overhead_rate_mode" NOT NULL DEFAULT 'DERIVED',
    "overhead_rate_per_minute" DECIMAL(14,6) NOT NULL DEFAULT 0.641000,
    "overhead_min_sample_minutes" INTEGER NOT NULL DEFAULT 600,
    "overhead_max_deviation_pct" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "retail_markup_pct" DECIMAL(5,2) NOT NULL DEFAULT 50,
    "wholesale_markup_pct" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "wholesale_threshold_qty" INTEGER NOT NULL DEFAULT 31,
    "min_margin_pct" DECIMAL(5,2) NOT NULL DEFAULT 25,
    "rounding_multiple" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    "supply_cost_window_days" INTEGER NOT NULL DEFAULT 180,
    "supply_cost_max_samples" INTEGER NOT NULL DEFAULT 5,
    "supply_cost_alert_pct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "default_asset_useful_life_months" INTEGER NOT NULL DEFAULT 24,
    "quotation_terms" TEXT NOT NULL DEFAULT '',
    "quotation_footer_note" TEXT NOT NULL DEFAULT '',
    "order_policy_text" TEXT NOT NULL DEFAULT '',
    "quotation_folio_prefix" TEXT NOT NULL DEFAULT 'COT',
    "order_folio_prefix" TEXT NOT NULL DEFAULT 'PED',
    "purchase_folio_prefix" TEXT NOT NULL DEFAULT 'COM',
    "payment_folio_prefix" TEXT NOT NULL DEFAULT 'PAG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "auth"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "candle_categories_name_key" ON "catalog"."candle_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candle_categories_slug_key" ON "catalog"."candle_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "candles_name_key" ON "catalog"."candles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "candles_slug_key" ON "catalog"."candles"("slug");

-- CreateIndex
CREATE INDEX "candles_category_id_idx" ON "catalog"."candles"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_types_name_key" ON "catalog"."packaging_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_types_slug_key" ON "catalog"."packaging_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "card_types_name_key" ON "catalog"."card_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "card_types_slug_key" ON "catalog"."card_types"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "packaging_supply_templates_packaging_type_id_supply_id_key" ON "catalog"."packaging_supply_templates"("packaging_type_id", "supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_supply_templates_card_type_id_supply_id_key" ON "catalog"."card_supply_templates"("card_type_id", "supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "catalog"."products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "catalog"."products"("slug");

-- CreateIndex
CREATE INDEX "products_candle_id_idx" ON "catalog"."products"("candle_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "catalog"."products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_visible_on_landing_is_active_idx" ON "catalog"."products"("is_visible_on_landing", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_components_product_id_candle_id_key" ON "catalog"."product_components"("product_id", "candle_id");

-- CreateIndex
CREATE INDEX "product_supplies_supply_id_idx" ON "catalog"."product_supplies"("supply_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_supplies_product_id_supply_id_key" ON "catalog"."product_supplies"("product_id", "supply_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "catalog"."product_images"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplies_name_key" ON "inventory"."supplies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "supplies_sku_key" ON "inventory"."supplies"("sku");

-- CreateIndex
CREATE INDEX "supplies_type_idx" ON "inventory"."supplies"("type");

-- CreateIndex
CREATE INDEX "stock_movements_supply_id_occurred_at_idx" ON "inventory"."stock_movements"("supply_id", "occurred_at");

-- CreateIndex
CREATE INDEX "stock_movements_ref_type_ref_id_idx" ON "inventory"."stock_movements"("ref_type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_folio_key" ON "inventory"."purchases"("folio");

-- CreateIndex
CREATE INDEX "purchases_purchased_at_idx" ON "inventory"."purchases"("purchased_at");

-- CreateIndex
CREATE INDEX "purchase_items_purchase_id_idx" ON "inventory"."purchase_items"("purchase_id");

-- CreateIndex
CREATE INDEX "purchase_items_supply_id_idx" ON "inventory"."purchase_items"("supply_id");

-- CreateIndex
CREATE INDEX "assets_kind_idx" ON "inventory"."assets"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "inventory"."expense_categories"("name");

-- CreateIndex
CREATE INDEX "expenses_period_month_idx" ON "inventory"."expenses"("period_month");

-- CreateIndex
CREATE UNIQUE INDEX "overhead_periods_year_month_key" ON "inventory"."overhead_periods"("year", "month");

-- CreateIndex
CREATE INDEX "customers_full_name_idx" ON "sales"."customers"("full_name");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "sales"."customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "quote_requests_converted_quotation_id_key" ON "sales"."quote_requests"("converted_quotation_id");

-- CreateIndex
CREATE INDEX "quote_requests_status_idx" ON "sales"."quote_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_folio_key" ON "sales"."quotations"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_public_token_key" ON "sales"."quotations"("public_token");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "sales"."quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_customer_id_idx" ON "sales"."quotations"("customer_id");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "sales"."quotation_items"("quotation_id");

-- CreateIndex
CREATE INDEX "quotation_items_product_id_idx" ON "sales"."quotation_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_folio_key" ON "sales"."orders"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "orders_quotation_id_key" ON "sales"."orders"("quotation_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "sales"."orders"("status");

-- CreateIndex
CREATE INDEX "orders_due_date_idx" ON "sales"."orders"("due_date");

-- CreateIndex
CREATE INDEX "orders_delivered_at_idx" ON "sales"."orders"("delivered_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "sales"."order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "sales"."order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_folio_key" ON "sales"."payments"("folio");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "sales"."payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "sales"."payments"("paid_at");

-- AddForeignKey
ALTER TABLE "catalog"."candles" ADD CONSTRAINT "candles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."candle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."candles" ADD CONSTRAINT "candles_wax_supply_id_fkey" FOREIGN KEY ("wax_supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."candles" ADD CONSTRAINT "candles_mold_asset_id_fkey" FOREIGN KEY ("mold_asset_id") REFERENCES "inventory"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."packaging_supply_templates" ADD CONSTRAINT "packaging_supply_templates_packaging_type_id_fkey" FOREIGN KEY ("packaging_type_id") REFERENCES "catalog"."packaging_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."packaging_supply_templates" ADD CONSTRAINT "packaging_supply_templates_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."card_supply_templates" ADD CONSTRAINT "card_supply_templates_card_type_id_fkey" FOREIGN KEY ("card_type_id") REFERENCES "catalog"."card_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."card_supply_templates" ADD CONSTRAINT "card_supply_templates_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog"."candle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_candle_id_fkey" FOREIGN KEY ("candle_id") REFERENCES "catalog"."candles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_packaging_type_id_fkey" FOREIGN KEY ("packaging_type_id") REFERENCES "catalog"."packaging_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."products" ADD CONSTRAINT "products_card_type_id_fkey" FOREIGN KEY ("card_type_id") REFERENCES "catalog"."card_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_components" ADD CONSTRAINT "product_components_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_components" ADD CONSTRAINT "product_components_candle_id_fkey" FOREIGN KEY ("candle_id") REFERENCES "catalog"."candles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_supplies" ADD CONSTRAINT "product_supplies_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_supplies" ADD CONSTRAINT "product_supplies_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."stock_movements" ADD CONSTRAINT "stock_movements_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchases" ADD CONSTRAINT "purchases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "inventory"."purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_items" ADD CONSTRAINT "purchase_items_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_items" ADD CONSTRAINT "purchase_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "inventory"."assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."purchase_items" ADD CONSTRAINT "purchase_items_expense_category_id_fkey" FOREIGN KEY ("expense_category_id") REFERENCES "inventory"."expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inventory"."expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quotations" ADD CONSTRAINT "quotations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."quotation_items" ADD CONSTRAINT "quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."orders" ADD CONSTRAINT "orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales"."quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "catalog"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales"."payments" ADD CONSTRAINT "payments_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
