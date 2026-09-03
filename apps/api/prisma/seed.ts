// Unico archivo del repo donde datos LITERALES del negocio (telefono,
// WhatsApp, direccion, textos legales) pueden aparecer escritos a mano —
// en todo lo demas viven en la tabla Settings y se editan en /configuracion.
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// tsx corre este script directo, sin pasar por prisma.config.ts: hay que
// cargar el .env de la raiz del monorepo a mano, igual que alli.
loadEnv({ path: path.resolve(process.cwd(), '../../.env') });

const prisma = new PrismaClient();

async function seedSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) {
    console.log('Settings ya existe, se omite.');
    return;
  }

  await prisma.settings.create({
    data: {
      id: 1,
      legalName: 'Lignum Vitae',
      brandName: 'Lignum Vitae',
      phone: '6183969515',
      whatsapp: '6183969515',
      email: 'contacto@lignumvitae.mx',
      city: 'Durango',
      state: 'Durango',
      businessHours: 'Lunes a sabado, 10:00 a 19:00',
      quotationTerms:
        'Los pedidos se deben ordenar con un minimo de 7 dias de anticipacion. Se confirma el pedido con el 40% de anticipo. Contamos con pago por transferencia y en efectivo. El envio tiene un costo adicional. Una vez confirmado el pedido, no hay cambios ni cancelaciones.',
      orderPolicyText:
        'Precios sujetos a cambios sin previo aviso hasta que el pedido sea confirmado con el anticipo correspondiente.',
    },
  });
  console.log('Settings sembrado.');
}

async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Usuario "${username}" ya existe, se omite.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      fullName: 'Administradora',
      role: 'super_user',
    },
  });
  console.log(`Usuario administrador "${username}" sembrado.`);
}

/**
 * Insumos base con el costo unitario DEDUCIDO del Cotizador LV.xlsx
 * (docs/Cotizador LV.xlsx). Sin historico de compras cargado (decision del
 * proyecto: "empezar en limpio"), currentUnitCost arranca con estos valores
 * y suggestedUnitCost se queda vacio hasta la primera compra real.
 */
async function seedSupplies() {
  const supplies: Array<{
    name: string;
    type: 'WAX' | 'FRAGRANCE' | 'WICK' | 'DYE' | 'ALUMINUM_BASE' | 'CELLOPHANE' | 'RIBBON' | 'LABEL' | 'PRINTING' | 'SEAL' | 'BELL' | 'SILICONE' | 'BOX' | 'TULLE' | 'ACETATE' | 'PAPER' | 'OTHER';
    unit: 'GRAM' | 'PIECE' | 'MILLILITER';
    currentUnitCost: number;
    defaultPackLabel?: string;
    defaultBaseQtyPerPack?: number;
  }> = [
    // Cera: $1978 / 20kg = $0.0989/g, del renglon de compra real de enero.
    { name: 'Parafina', type: 'WAX', unit: 'GRAM', currentUnitCost: 0.0989, defaultPackLabel: 'bulto de 20 kg', defaultBaseQtyPerPack: 20000 },
    { name: 'Mecha', type: 'WICK', unit: 'PIECE', currentUnitCost: 0.4 },
    { name: 'Base de aluminio', type: 'ALUMINUM_BASE', unit: 'PIECE', currentUnitCost: 0.5 },
    { name: 'Colorante / aditivo', type: 'DYE', unit: 'PIECE', currentUnitCost: 0.5 },
    { name: 'Celofan', type: 'CELLOPHANE', unit: 'PIECE', currentUnitCost: 0.45 },
    { name: 'Liston', type: 'RIBBON', unit: 'PIECE', currentUnitCost: 0.3 },
    { name: 'Etiqueta 5x5 impresa a una cara', type: 'LABEL', unit: 'PIECE', currentUnitCost: 0.1 },
    { name: 'Tarjeta 9x12', type: 'LABEL', unit: 'PIECE', currentUnitCost: 0.66 },
    { name: 'Impresion', type: 'PRINTING', unit: 'PIECE', currentUnitCost: 0.2 },
    { name: 'Sello', type: 'SEAL', unit: 'PIECE', currentUnitCost: 0.1 },
    { name: 'Cascabel', type: 'BELL', unit: 'PIECE', currentUnitCost: 0.2 },
    { name: 'Silicon', type: 'SILICONE', unit: 'PIECE', currentUnitCost: 0.1 },
    { name: 'Caja personalizada', type: 'BOX', unit: 'PIECE', currentUnitCost: 0.66 },
    { name: 'Tul', type: 'TULLE', unit: 'PIECE', currentUnitCost: 1.5 },
    { name: 'Caja de acetato', type: 'ACETATE', unit: 'PIECE', currentUnitCost: 2.0 },
    { name: 'Papel coreano', type: 'PAPER', unit: 'SHEET' as never, currentUnitCost: 0.625 },
    { name: 'Aroma (esencia)', type: 'FRAGRANCE', unit: 'MILLILITER', currentUnitCost: 0.5 },
  ];

  for (const supply of supplies) {
    const existing = await prisma.supply.findUnique({ where: { name: supply.name } });
    if (existing) continue;
    await prisma.supply.create({ data: supply as never });
  }
  console.log(`Insumos base sembrados (${supplies.length}).`);
}

async function seedCategories() {
  const categories = [
    { name: 'Animalitos', slug: 'animalitos', colorHex: '#8A9A5B', sortOrder: 1 },
    { name: 'Flores', slug: 'flores', colorHex: '#C97B84', sortOrder: 2 },
    { name: 'Corazones', slug: 'corazones', colorHex: '#B5566B', sortOrder: 3 },
    { name: 'Religiosos', slug: 'religiosos', colorHex: '#7A6A53', sortOrder: 4 },
    { name: 'Navidad', slug: 'navidad', colorHex: '#4A7871', sortOrder: 5 },
    { name: 'Ramos', slug: 'ramos', colorHex: '#3D6660', sortOrder: 6 },
  ];

  for (const category of categories) {
    const existing = await prisma.candleCategory.findUnique({ where: { slug: category.slug } });
    if (existing) continue;
    await prisma.candleCategory.create({ data: category });
  }
  console.log(`Categorias sembradas (${categories.length}).`);
}

async function seedPackagingTypes() {
  const wax = await prisma.supply.findUnique({ where: { name: 'Parafina' } });
  const cellophane = await prisma.supply.findUnique({ where: { name: 'Celofan' } });
  const ribbon = await prisma.supply.findUnique({ where: { name: 'Liston' } });
  const label = await prisma.supply.findUnique({ where: { name: 'Etiqueta 5x5 impresa a una cara' } });
  const printing = await prisma.supply.findUnique({ where: { name: 'Impresion' } });
  const box = await prisma.supply.findUnique({ where: { name: 'Caja personalizada' } });
  const tulle = await prisma.supply.findUnique({ where: { name: 'Tul' } });
  const acetate = await prisma.supply.findUnique({ where: { name: 'Caja de acetato' } });
  const paper = await prisma.supply.findUnique({ where: { name: 'Papel coreano' } });
  if (!cellophane || !ribbon || !label || !printing || !box || !tulle || !acetate || !paper) return;

  const types = [
    { name: 'Sola', slug: 'sola', packMinutes: 0, setupMinutes: 0, supplyTemplate: [] as { supplyId: number; quantity: number; unit: 'PIECE' }[] },
    {
      name: 'Celofan con Liston',
      slug: 'celofan-con-liston',
      packMinutes: 2,
      setupMinutes: 15,
      supplyTemplate: [
        { supplyId: cellophane.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: ribbon.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: label.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: printing.id, quantity: 1, unit: 'PIECE' as const },
      ],
    },
    {
      name: 'Caja Personalizada',
      slug: 'caja-personalizada',
      packMinutes: 3,
      setupMinutes: 30,
      supplyTemplate: [
        { supplyId: box.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: printing.id, quantity: 1, unit: 'PIECE' as const },
      ],
    },
    {
      name: 'Tul',
      slug: 'tul',
      packMinutes: 3,
      setupMinutes: 15,
      supplyTemplate: [
        { supplyId: tulle.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: ribbon.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: label.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: printing.id, quantity: 1, unit: 'PIECE' as const },
      ],
    },
    {
      name: 'Caja de Acetato',
      slug: 'caja-de-acetato',
      packMinutes: 3,
      setupMinutes: 15,
      supplyTemplate: [{ supplyId: acetate.id, quantity: 1, unit: 'PIECE' as const }],
    },
    {
      // La hoja "Catalogo Ramos" del Excel: una vela envuelta en papel
      // coreano en vez de celofan. Empaquetado 5 min, sin tiempo de diseno.
      name: 'Ramo (papel coreano)',
      slug: 'ramo',
      packMinutes: 5,
      setupMinutes: 0,
      supplyTemplate: [
        { supplyId: paper.id, quantity: 1, unit: 'SHEET' as never },
        { supplyId: ribbon.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: label.id, quantity: 1, unit: 'PIECE' as const },
        { supplyId: printing.id, quantity: 1, unit: 'PIECE' as const },
      ],
    },
  ];

  for (const type of types) {
    const existing = await prisma.packagingType.findUnique({ where: { slug: type.slug } });
    if (existing) continue;
    await prisma.packagingType.create({
      data: {
        name: type.name,
        slug: type.slug,
        packMinutes: type.packMinutes,
        setupMinutes: type.setupMinutes,
        supplyTemplate: type.supplyTemplate.length ? { create: type.supplyTemplate } : undefined,
      },
    });
  }
  console.log(`Tipos de empaque sembrados (${types.length}).`);
  void wax;
}

async function seedCardTypes() {
  const label = await prisma.supply.findUnique({ where: { name: 'Etiqueta 5x5 impresa a una cara' } });
  const card912 = await prisma.supply.findUnique({ where: { name: 'Tarjeta 9x12' } });
  if (!label || !card912) return;

  const types = [
    {
      name: 'Etiqueta 5x5 una cara',
      slug: 'etiqueta-5x5-una-cara',
      widthCm: 5,
      heightCm: 5,
      printedSides: 1,
      setupMinutes: 15,
      supplyTemplate: [{ supplyId: label.id, quantity: 1, unit: 'PIECE' as const }],
    },
    {
      name: 'Etiqueta 5x5 dos caras',
      slug: 'etiqueta-5x5-dos-caras',
      widthCm: 5,
      heightCm: 5,
      printedSides: 2,
      setupMinutes: 15,
      supplyTemplate: [{ supplyId: label.id, quantity: 1, unit: 'PIECE' as const }],
    },
    {
      name: 'Tarjeta 9x12',
      slug: 'tarjeta-9x12',
      widthCm: 9,
      heightCm: 12,
      printedSides: 1,
      setupMinutes: 30,
      supplyTemplate: [{ supplyId: card912.id, quantity: 1, unit: 'PIECE' as const }],
    },
  ];

  for (const type of types) {
    const existing = await prisma.cardType.findUnique({ where: { slug: type.slug } });
    if (existing) continue;
    await prisma.cardType.create({
      data: {
        name: type.name,
        slug: type.slug,
        widthCm: type.widthCm,
        heightCm: type.heightCm,
        printedSides: type.printedSides,
        setupMinutes: type.setupMinutes,
        supplyTemplate: { create: type.supplyTemplate },
      },
    });
  }
  console.log(`Tipos de tarjeta sembrados (${types.length}).`);
}

async function seedExpenseCategories() {
  const categories = [
    { name: 'Gas', kind: 'OVERHEAD' as const },
    { name: 'Luz', kind: 'OVERHEAD' as const },
    { name: 'Renta del taller', kind: 'OVERHEAD' as const },
    { name: 'Envios y paqueteria', kind: 'OVERHEAD' as const },
    { name: 'Depreciacion de activos', kind: 'OVERHEAD' as const },
    { name: 'Publicidad', kind: 'NON_OPERATING' as const },
    { name: 'Comisiones bancarias', kind: 'NON_OPERATING' as const },
  ];
  for (const category of categories) {
    const existing = await prisma.expenseCategory.findUnique({ where: { name: category.name } });
    if (existing) continue;
    await prisma.expenseCategory.create({ data: category });
  }
  console.log(`Categorias de gasto sembradas (${categories.length}).`);
}

async function main() {
  await seedSettings();
  await seedAdmin();
  await seedSupplies();
  await seedCategories();
  await seedPackagingTypes();
  await seedCardTypes();
  await seedExpenseCategories();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
