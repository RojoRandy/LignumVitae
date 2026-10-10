-- AlterTable
ALTER TABLE "catalog"."products" ADD COLUMN "includes" TEXT;

-- Separa "Incluye:" de la descripcion. Los productos lo traen como "<texto>\n\nIncluye:\n- item\n- item".
-- Solo corta en "Incluye:" con dos puntos ("Incluye una etiqueta..." sin dos puntos se queda en la descripcion).
-- Postgres evalua el SET con los valores anteriores de la fila, por eso ambas asignaciones leen "description".
-- El WHERE la hace segura de re-ejecutar y no pisa un "includes" capturado a mano.
UPDATE "catalog"."products"
SET "includes"    = NULLIF(BTRIM(SUBSTRING("description" FROM POSITION('Incluye:' IN "description") + 8), E' \t\r\n'), ''),
    "description" = NULLIF(BTRIM(LEFT("description", POSITION('Incluye:' IN "description") - 1), E' \t\r\n'), '')
WHERE "description" LIKE '%Incluye:%' AND "includes" IS NULL;
