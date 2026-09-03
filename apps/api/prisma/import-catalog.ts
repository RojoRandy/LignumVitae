// Importador del catalogo real de Lignum Vitae, a partir del plan resuelto
// en prisma/import-data/import-plan.json (generado del Cotizador LV.xlsx).
//
// PrismaClient directo, sin bootstrapear Nest: correr la app completa via
// tsx falla en JwtStrategy porque esbuild no emite metadata de decoradores
// tan completa como tsc (@nestjs/config queda undefined al inyectar). El
// patron correcto para scripts CLI de este repo es este: igual que
// prisma/seed.ts, se replica a mano la MISMA logica de negocio que usan los
// services reales (duplicados, slug/sku, copiado de plantillas, costeo),
// citando el archivo fuente en cada bloque para poder mantenerlos en sync.
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

import { PrismaClient, ProductKind, type Prisma, type SupplySource } from '@prisma/client';
import { calculateProductCost, suggestPrices, laborRatePerMinute as computeLaborRate } from '@lignumvitae/types';

const prisma = new PrismaClient();

// Mismo algoritmo que src/common/utils/slug.ts
const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

interface PlanCandle {
  key: [string, number];
  name: string;
  grams: number;
  meltMinutes: number;
  categorySlug: string;
  mechaQty: number;
  baseAluminioQty: number;
  coloranteQty: number;
}

interface PlanProduct {
  excelName: string;
  candleKey: [string, number];
  packagingSlug: string;
  cardSlug: string | null;
  note: string | null;
  costoTotalExcel: number;
  precioMenudeoExcel: number;
  precioMayoreoExcel: number;
}

interface ImportPlan {
  candles: PlanCandle[];
  products: PlanProduct[];
  ramoProducts: PlanProduct[];
}

const keyOf = (key: [string, number]) => `${key[0]}::${key[1]}`;

// Igual que ProductsService.generateSku (verificando el SKU en si, no el
// slug -- ver el fix aplicado alla mismo).
async function generateSku(name: string): Promise<string> {
  const base = slugify(name).toUpperCase().replace(/-/g, '');
  const truncated = base.slice(0, 12);
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = suffix > 0 ? `${truncated}-${suffix}` : truncated;
    const existing = await prisma.product.findUnique({ where: { sku: candidate } });
    if (!existing) return candidate;
    suffix += 1;
  }
}

// Igual que RecalculateProductCostingUseCase, pero contra un id recien creado.
async function recalcCosting(productId: number) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      candle: { include: { waxSupply: true, supplyTemplate: { include: { supply: true } } } },
      packagingType: { include: { supplyTemplate: { include: { supply: true } } } },
      cardType: { include: { supplyTemplate: { include: { supply: true } } } },
      supplies: { include: { supply: true } },
    },
  });

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  const closedPeriod = await prisma.overheadPeriod.findFirst({
    where: { closedAt: { not: null } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const laborRate = computeLaborRate(settings.dailyWage.toNumber(), settings.workHoursPerDay);
  const overheadRate = closedPeriod ? closedPeriod.ratePerMinute.toNumber() : settings.overheadRatePerMinute.toNumber();
  const defaultWaxUnitCost = settings.waxSupplyId
    ? (await prisma.supply.findUnique({ where: { id: settings.waxSupplyId } }))?.currentUnitCost.toNumber() ?? 0
    : 0;

  if (!product.candle) throw new Error(`Producto ${productId} sin vela: no se puede costear`);

  const waxUnitCost = product.candle.waxSupply?.currentUnitCost.toNumber() ?? defaultWaxUnitCost;
  const templateSupplies = [
    ...product.candle.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })),
    ...(product.packagingType?.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })) ?? []),
    ...(product.cardType?.supplyTemplate.map((t) => ({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unitCost: t.supply.currentUnitCost.toNumber() })) ?? []),
  ];
  const manualSupplies = product.supplies
    .filter((s) => s.source === 'MANUAL')
    .map((s) => ({ supplyId: s.supplyId, quantity: s.quantity.toNumber(), unitCost: s.supply.currentUnitCost.toNumber() }));

  const setupMinutes = (product.packagingType?.setupMinutes ?? 0) + (product.cardType?.setupMinutes ?? 0) + product.extraSetupMinutes;
  const packMinutes = (product.packagingType?.packMinutes ?? 0) + product.extraPackMinutes;

  const breakdown = calculateProductCost({
    grams: product.candle.grams.toNumber(),
    wastePct: product.candle.wastePct.toNumber(),
    waxUnitCost,
    supplies: [...templateSupplies, ...manualSupplies],
    meltMinutes: product.candle.meltMinutes,
    meltBatchGrams: product.candle.meltBatchGrams ?? settings.meltBatchGrams,
    setupMinutes,
    packMinutes,
    prorationQuantity: settings.wholesaleThresholdQty,
    laborRatePerMinute: laborRate,
    overheadRatePerMinute: overheadRate,
    fragrance: null,
  });

  const prices = suggestPrices(breakdown.unitTotalCost, {
    retailMarkupPct: settings.retailMarkupPct.toNumber(),
    wholesaleMarkupPct: settings.wholesaleMarkupPct.toNumber(),
    roundingMultiple: settings.roundingMultiple.toNumber(),
  });

  return prisma.product.update({
    where: { id: productId },
    data: {
      unitWaxCost: breakdown.unitWaxCost,
      unitSupplyCost: breakdown.unitSupplyCost,
      unitLaborCost: breakdown.unitLaborCost,
      unitOverheadCost: breakdown.unitOverheadCost,
      unitTotalCost: breakdown.unitTotalCost,
      retailListPrice: prices.retail.suggestedPrice,
      wholesaleListPrice: prices.wholesale.suggestedPrice,
      costingBasis: {
        laborRatePerMinute: laborRate,
        overheadRatePerMinute: overheadRate,
        overheadRateSource: closedPeriod ? closedPeriod.rateSource : 'FALLBACK',
        waxUnitCost,
        meltBatchGrams: settings.meltBatchGrams,
        prorationQuantity: settings.wholesaleThresholdQty,
        retailMarkupPct: settings.retailMarkupPct.toNumber(),
        wholesaleMarkupPct: settings.wholesaleMarkupPct.toNumber(),
        roundingMultiple: settings.roundingMultiple.toNumber(),
        breakdown: { ...breakdown },
      } satisfies Prisma.InputJsonObject,
      costingComputedAt: new Date(),
    },
  });
}

async function main() {
  const planPath = path.resolve(__dirname, 'import-data/import-plan.json');
  const plan: ImportPlan = JSON.parse(readFileSync(planPath, 'utf-8'));

  const categories = await prisma.candleCategory.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const packagingTypes = await prisma.packagingType.findMany();
  const packagingBySlug = new Map(packagingTypes.map((p) => [p.slug, p.id]));
  const cardTypes = await prisma.cardType.findMany();
  const cardBySlug = new Map(cardTypes.map((c) => [c.slug, c.id]));
  const supplies = await prisma.supply.findMany();
  const supplyByName = new Map(supplies.map((s) => [s.name, s.id]));

  const mechaId = supplyByName.get('Mecha');
  const baseAluminioId = supplyByName.get('Base de aluminio');
  const coloranteId = supplyByName.get('Colorante / aditivo');

  // --- 1) Velas ---
  const candleIdByKey = new Map<string, number>();
  let candlesCreated = 0;
  let candlesSkipped = 0;

  for (const c of plan.candles) {
    const slug = slugify(c.name);
    const existing = await prisma.candle.findUnique({ where: { slug } });
    if (existing) {
      candleIdByKey.set(keyOf(c.key), existing.id);
      candlesSkipped++;
      continue;
    }

    const categoryId = categoryBySlug.get(c.categorySlug);
    if (!categoryId) {
      console.warn(`  ! Categoria "${c.categorySlug}" no encontrada para vela "${c.name}", se omite.`);
      continue;
    }

    const supplyTemplate: { supplyId: number; quantity: number; unit: 'PIECE' }[] = [];
    if (c.mechaQty > 0 && mechaId) supplyTemplate.push({ supplyId: mechaId, quantity: c.mechaQty, unit: 'PIECE' });
    if (c.baseAluminioQty > 0 && baseAluminioId) supplyTemplate.push({ supplyId: baseAluminioId, quantity: c.baseAluminioQty, unit: 'PIECE' });
    if (c.coloranteQty > 0 && coloranteId) supplyTemplate.push({ supplyId: coloranteId, quantity: c.coloranteQty, unit: 'PIECE' });

    const created = await prisma.candle.create({
      data: {
        name: c.name,
        slug,
        category: { connect: { id: categoryId } },
        grams: c.grams,
        meltMinutes: c.meltMinutes || 15,
        supplyTemplate: supplyTemplate.length ? { create: supplyTemplate } : undefined,
      },
    });
    candleIdByKey.set(keyOf(c.key), created.id);
    candlesCreated++;
  }
  console.log(`Velas: ${candlesCreated} creadas, ${candlesSkipped} ya existian.`);

  // --- 2) Productos (catalogo + ramos) ---
  const allProducts = [...plan.products, ...plan.ramoProducts];
  let productsCreated = 0;
  let productsSkipped = 0;
  let productsFlagged = 0;
  const skippedRows: string[] = [];

  for (const p of allProducts) {
    const slug = slugify(p.excelName);
    const existingProduct = await prisma.product.findUnique({ where: { slug } });
    if (existingProduct) {
      productsSkipped++;
      continue;
    }

    const candleId = candleIdByKey.get(keyOf(p.candleKey));
    if (!candleId) {
      skippedRows.push(`${p.excelName} (sin vela resuelta)`);
      continue;
    }
    const packagingTypeId = packagingBySlug.get(p.packagingSlug) ?? null;
    const cardTypeId = p.cardSlug ? (cardBySlug.get(p.cardSlug) ?? null) : null;

    const candle = await prisma.candle.findUnique({ where: { id: candleId }, include: { supplyTemplate: true } });
    if (!candle) {
      skippedRows.push(`${p.excelName} (vela ${candleId} no encontrada)`);
      continue;
    }

    // Duplicados: misma vela + mismo empaque + misma tarjeta ya existente.
    const duplicate = await prisma.product.findFirst({ where: { candleId, packagingTypeId, cardTypeId, isActive: true } });
    if (duplicate) {
      skippedRows.push(`${p.excelName} (duplicado de "${duplicate.name}")`);
      continue;
    }

    const sku = await generateSku(p.excelName);
    const created = await prisma.product.create({
      data: {
        sku,
        name: p.excelName,
        slug,
        kind: ProductKind.SIMPLE,
        category: { connect: { id: candle.categoryId } },
        candle: { connect: { id: candleId } },
        packagingType: packagingTypeId ? { connect: { id: packagingTypeId } } : undefined,
        cardType: cardTypeId ? { connect: { id: cardTypeId } } : undefined,
      },
    });

    // Copia las plantillas de vela + empaque + tarjeta a ProductSupply,
    // igual que ProductsService.applySuppliesFromTemplatesAndManual.
    const packaging = packagingTypeId
      ? await prisma.packagingType.findUnique({ where: { id: packagingTypeId }, include: { supplyTemplate: true } })
      : null;
    const card = cardTypeId ? await prisma.cardType.findUnique({ where: { id: cardTypeId }, include: { supplyTemplate: true } }) : null;

    const supplyItems: { supplyId: number; quantity: number; unit: string; note?: string | null; source: SupplySource }[] = [];
    candle.supplyTemplate.forEach((t) => supplyItems.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unit: t.unit, note: t.note, source: 'CANDLE_TEMPLATE' }));
    packaging?.supplyTemplate.forEach((t) => supplyItems.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unit: t.unit, note: t.note, source: 'PACKAGING_TEMPLATE' }));
    card?.supplyTemplate.forEach((t) => supplyItems.push({ supplyId: t.supplyId, quantity: t.quantity.toNumber(), unit: t.unit, note: t.note, source: 'CARD_TEMPLATE' }));
    const bySupplyId = new Map(supplyItems.map((i) => [i.supplyId, i]));
    if (bySupplyId.size > 0) {
      await prisma.productSupply.createMany({
        data: [...bySupplyId.values()].map((i) => ({
          productId: created.id,
          supplyId: i.supplyId,
          quantity: i.quantity,
          unit: i.unit as never,
          note: i.note,
          source: i.source,
        })),
      });
    }

    const recalculated = await recalcCosting(created.id);

    const computedCost = recalculated.unitTotalCost.toNumber();
    const excelCost = p.costoTotalExcel;
    const deviationPct = excelCost > 0 ? (Math.abs(computedCost - excelCost) / excelCost) * 100 : 0;

    const reasons: string[] = [];
    if (p.note) reasons.push(p.note);
    if (deviationPct > 15) {
      reasons.push(
        `Costo calculado ($${computedCost.toFixed(2)}) se desvia ${deviationPct.toFixed(0)}% del costo capturado en el Excel ($${excelCost.toFixed(2)}).`,
      );
    }

    if (reasons.length > 0) {
      await prisma.product.update({ where: { id: created.id }, data: { needsReview: true, reviewNote: reasons.join(' | ') } });
      productsFlagged++;
    }

    productsCreated++;
  }

  console.log(`Productos: ${productsCreated} creados, ${productsSkipped} ya existian, ${productsFlagged} marcados para revisar.`);
  if (skippedRows.length) {
    console.log(`Filas omitidas (${skippedRows.length}):`);
    skippedRows.forEach((r) => console.log(`  - ${r}`));
  }

  const flagged = await prisma.product.findMany({
    where: { needsReview: true },
    select: { name: true, reviewNote: true, unitTotalCost: true, retailListPrice: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n=== ${flagged.length} productos marcados "revisar" ===`);
  flagged.forEach((f) => console.log(`- ${f.name}\n    ${f.reviewNote}`));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
