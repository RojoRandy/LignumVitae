-- CreateTable
CREATE TABLE "sales"."shared_quotes" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "event_date" DATE,
    "items" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shared_quotes_token_key" ON "sales"."shared_quotes"("token");
