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

async function seedUnitsAndSupplyTypes() {
  const supplyTypes = [
    { slug: 'WAX', name: 'Cera', sortOrder: 10 },
    { slug: 'FRAGRANCE', name: 'Aroma', sortOrder: 20 },
    { slug: 'WICK', name: 'Mecha', sortOrder: 30 },
    { slug: 'DYE', name: 'Colorante', sortOrder: 40 },
    { slug: 'ALUMINUM_BASE', name: 'Base de aluminio', sortOrder: 50 },
    { slug: 'CELLOPHANE', name: 'Celofan', sortOrder: 60 },
    { slug: 'RIBBON', name: 'Liston', sortOrder: 70 },
    { slug: 'LABEL', name: 'Etiqueta', sortOrder: 80 },
    { slug: 'PRINTING', name: 'Impresion', sortOrder: 90 },
    { slug: 'SEAL', name: 'Sello', sortOrder: 100 },
    { slug: 'BELL', name: 'Cascabel', sortOrder: 110 },
    { slug: 'SILICONE', name: 'Silicon', sortOrder: 120 },
    { slug: 'BOX', name: 'Caja', sortOrder: 130 },
    { slug: 'TULLE', name: 'Tul', sortOrder: 140 },
    { slug: 'ACETATE', name: 'Acetato', sortOrder: 150 },
    { slug: 'PAPER', name: 'Papel', sortOrder: 160 },
    { slug: 'OTHER', name: 'Otro', sortOrder: 170 },
  ];

  for (const type of supplyTypes) {
    const existing = await prisma.supplyType.findUnique({ where: { slug: type.slug } });
    if (existing) continue;
    await prisma.supplyType.create({ data: type });
  }
  console.log(`Tipos de insumo sembrados (${supplyTypes.length}).`);

  const units = [
    { slug: 'GRAM', name: 'Gramo', abbr: 'g', sortOrder: 10 },
    { slug: 'KILOGRAM', name: 'Kilogramo', abbr: 'kg', sortOrder: 20 },
    { slug: 'MILLILITER', name: 'Mililitro', abbr: 'ml', sortOrder: 30 },
    { slug: 'LITER', name: 'Litro', abbr: 'l', sortOrder: 40 },
    { slug: 'CENTIMETER', name: 'Centimetro', abbr: 'cm', sortOrder: 50 },
    { slug: 'METER', name: 'Metro', abbr: 'm', sortOrder: 60 },
    { slug: 'PIECE', name: 'Pieza', abbr: 'pz', sortOrder: 70 },
    { slug: 'SHEET', name: 'Pliego', abbr: 'pliegos', sortOrder: 80 },
  ];

  for (const unit of units) {
    const existing = await prisma.unitOfMeasure.findUnique({ where: { slug: unit.slug } });
    if (existing) continue;
    await prisma.unitOfMeasure.create({ data: unit });
  }
  console.log(`Unidades de medida sembradas (${units.length}).`);
}

async function seedSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: 1 } });
  if (existing) {
    console.log('Settings ya existe, se omite.');
    return;
  }

  const waxType = await prisma.supplyType.findUniqueOrThrow({ where: { slug: 'WAX' } });
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
      waxSupplyTypeId: waxType.id,
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
  await seedUnitsAndSupplyTypes();
  await seedSettings();
  await seedAdmin();
  await seedExpenseCategories();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
