-- AlterTable
ALTER TABLE "catalog"."product_images" ADD COLUMN     "show_in_gallery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_in_hero" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sales"."testimonials" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER,
    "customer_name" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "testimonials_order_id_key" ON "sales"."testimonials"("order_id");

-- AddForeignKey
ALTER TABLE "sales"."testimonials" ADD CONSTRAINT "testimonials_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
