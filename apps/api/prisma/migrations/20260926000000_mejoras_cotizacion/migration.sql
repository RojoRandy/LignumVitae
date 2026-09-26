-- AlterTable
ALTER TABLE "sales"."customers" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "config"."settings" ADD COLUMN     "bank_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bank_account_holder" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bank_clabe" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bank_card_number" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "sales"."quotations" ADD COLUMN     "accumulate_pieces" BOOLEAN NOT NULL DEFAULT true;
