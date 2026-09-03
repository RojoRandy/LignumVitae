-- AlterEnum
ALTER TYPE "catalog"."supply_source" ADD VALUE 'CANDLE_TEMPLATE';

-- CreateTable
CREATE TABLE "catalog"."candle_supply_templates" (
    "id" SERIAL NOT NULL,
    "candle_id" INTEGER NOT NULL,
    "supply_id" INTEGER NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" "inventory"."unit_of_measure" NOT NULL,
    "note" TEXT,

    CONSTRAINT "candle_supply_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candle_supply_templates_candle_id_supply_id_key" ON "catalog"."candle_supply_templates"("candle_id", "supply_id");

-- AddForeignKey
ALTER TABLE "catalog"."candle_supply_templates" ADD CONSTRAINT "candle_supply_templates_candle_id_fkey" FOREIGN KEY ("candle_id") REFERENCES "catalog"."candles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."candle_supply_templates" ADD CONSTRAINT "candle_supply_templates_supply_id_fkey" FOREIGN KEY ("supply_id") REFERENCES "inventory"."supplies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
