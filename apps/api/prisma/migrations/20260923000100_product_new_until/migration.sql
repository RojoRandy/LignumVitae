-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN     "new_until" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "products_new_until_idx" ON "catalog"."products"("new_until");
