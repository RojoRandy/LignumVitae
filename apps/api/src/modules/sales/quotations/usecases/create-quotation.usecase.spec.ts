// La solicitud web queda CONVERTED en la misma transaccion que crea la
// cotizacion; si ya no estaba en NEW, la transaccion completa se cae.
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateQuotationUseCase } from './create-quotation.usecase';

const build = (markedRows: number) => {
  const tx = {
    quotation: { create: jest.fn().mockResolvedValue({ id: 10 }) },
    quotationItem: { createMany: jest.fn() },
  };
  const quotationRepository = {
    runInTransaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    findById: jest.fn().mockResolvedValue({ id: 10 }),
  };
  const quoteRequestRepository = {
    findById: jest.fn().mockResolvedValue({ id: 7, status: 'NEW' }),
    markFromNew: jest.fn().mockResolvedValue(markedRows),
  };
  const useCase = new CreateQuotationUseCase(
    quotationRepository as never,
    { findById: jest.fn().mockResolvedValue({ id: 1 }) } as never,
    {} as never,
    { get: jest.fn().mockResolvedValue({ minLeadTimeDays: 7, quotationValidityDays: 7, quotationFolioPrefix: 'COT' }) } as never,
    {} as never,
    {} as never,
    {} as never,
    { next: jest.fn().mockResolvedValue('COT-2026-0001') } as never,
    quoteRequestRepository as never,
  );
  // El costeo real no importa aqui: un renglon con numeros cualquiera.
  jest.spyOn(useCase, 'computePricing').mockResolvedValue({
    totals: { items: [{}] },
    costings: [{ fragranceMlPerUnit: 1.25 }],
    totalWaxGrams: 0,
  } as never);
  return { useCase, tx, quoteRequestRepository };
};

const dto = { customerId: 1, quoteRequestId: 7, items: [{ productId: 1, quantity: 1 }] };

it('acepta una fecha de evento de mañana (pedido express)', async () => {
  const { useCase } = build(1);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await expect(useCase.execute({
    dto: { customerId: 1, eventDate: tomorrow.toISOString().slice(0, 10), items: [{ productId: 1, quantity: 1 }] },
  })).resolves.toEqual({ id: 10 });
});

it('persiste accumulatePieces=false y lo pasa al costeo', async () => {
  const { useCase, tx } = build(1);
  const items = [{ productId: 1, quantity: 1 }];

  await useCase.execute({ dto: { customerId: 1, accumulatePieces: false, items } });

  expect(useCase.computePricing).toHaveBeenCalledWith(items, expect.objectContaining({ accumulatePieces: false }), expect.anything());
  expect(tx.quotation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ accumulatePieces: false }) });
});

it('sin la bandera guarda accumulatePieces=true (comportamiento historico)', async () => {
  const { useCase, tx } = build(1);

  await useCase.execute({ dto: { customerId: 1, items: [{ productId: 1, quantity: 1 }] } });

  expect(tx.quotation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ accumulatePieces: true }) });
});

it('marca la solicitud CONVERTED con la cotizacion nueva, dentro de la transaccion', async () => {
  const { useCase, tx, quoteRequestRepository } = build(1);

  await useCase.execute({ dto, userId: 1 });

  expect(quoteRequestRepository.markFromNew).toHaveBeenCalledWith(7, { status: 'CONVERTED', convertedQuotationId: 10 }, tx);
});

it('si la solicitud ya no esta en NEW, falla y no regresa cotizacion', async () => {
  const { useCase } = build(0);

  await expect(useCase.execute({ dto, userId: 1 })).rejects.toBeInstanceOf(ConflictException);
});

it('al editar ignora quoteRequestId', async () => {
  const { useCase, quoteRequestRepository } = build(1);
  const tx = { quotation: { update: jest.fn() }, quotationItem: { deleteMany: jest.fn(), createMany: jest.fn() } };
  (useCase as unknown as { quotationRepository: { runInTransaction: jest.Mock } }).quotationRepository.runInTransaction = jest.fn(
    (fn: (t: typeof tx) => unknown) => fn(tx),
  );

  await useCase.execute({ dto, userId: 1, existingId: 10 });

  expect(quoteRequestRepository.findById).not.toHaveBeenCalled();
  expect(quoteRequestRepository.markFromNew).not.toHaveBeenCalled();
});

it('guarda la cotizacion aunque el costeo traiga avisos de margen', async () => {
  const { useCase, tx } = build(1);
  (useCase.computePricing as jest.Mock).mockResolvedValue({
    totals: { items: [{}] },
    warnings: [{ itemIndex: 0, productId: 1, hasManualPrice: true, marginPct: 10, minMarginPct: 25, minUnitPrice: 20, minManualPrice: 19 }],
    costings: [{ fragranceMlPerUnit: 0 }],
    totalWaxGrams: 0,
  });

  await expect(useCase.execute({ dto })).resolves.toBeDefined();
  expect(tx.quotation.create).toHaveBeenCalled();
});

it('guarda fragranceMlPerUnit del costeo en el renglon', async () => {
  const { useCase, tx } = build(1);

  await useCase.execute({ dto });

  expect(tx.quotationItem.createMany).toHaveBeenCalledWith({
    data: [expect.objectContaining({ productId: 1, fragranceMlPerUnit: 1.25 })],
  });
});

const buildPricing = () => {
  const settings = {
    dailyWage: new Prisma.Decimal(480),
    workHoursPerDay: new Prisma.Decimal(8),
    overheadRateMode: 'FIXED',
    overheadRatePerMinute: new Prisma.Decimal(1),
    fragranceSurcharge: new Prisma.Decimal(5),
    fragranceDropsPer100g: 10,
    fragranceRealCost: true,
    wholesaleThresholdQty: 12,
    depositPct: new Prisma.Decimal(50),
    roundingMultiple: new Prisma.Decimal(1),
    minMarginPct: new Prisma.Decimal(20),
  };
  const lineCosting = {
    costLine: jest.fn().mockReturnValue({ unitTotalCost: 50, waxGramsPerUnit: 100, fragranceMlPerUnit: 1.25 }),
  };
  const useCase = new CreateQuotationUseCase(
    {} as never,
    {} as never,
    { findManyByIds: jest.fn().mockResolvedValue([{
      id: 1, isActive: true, retailListPrice: new Prisma.Decimal(100), wholesaleListPrice: new Prisma.Decimal(80),
    }]) } as never,
    {} as never,
    { findMostRecentClosed: jest.fn().mockResolvedValue(null) } as never,
    { findMany: jest.fn().mockResolvedValue([{
      id: 2, isActive: true, isFragrance: true, currentUnitCost: new Prisma.Decimal(3), unit: { slug: 'MILLILITER', abbr: 'ml' },
    }]) } as never,
    lineCosting as never,
    {} as never,
    {} as never,
  );
  return { useCase, settings, lineCosting };
};

it('un precio manual bajo el piso solo avisa (no lanza) y senala el renglon correcto', async () => {
  const { useCase, settings } = buildPricing();

  const result = await useCase.computePricing([
    { productId: 1, quantity: 1, unitPriceOverride: 100 },
    { productId: 1, quantity: 1, unitPriceOverride: 40 },
  ], {}, settings as never);

  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0]).toMatchObject({ itemIndex: 1, productId: 1, hasManualPrice: true, minMarginPct: 20 });
});

it('el precio de lista bajo el piso tambien avisa, sin marcarlo como manual', async () => {
  const { useCase, settings, lineCosting } = buildPricing();
  // costo 90 contra precio de lista 100 => 10 % de margen, piso 20 %
  lineCosting.costLine.mockReturnValue({ unitTotalCost: 90, waxGramsPerUnit: 100, fragranceMlPerUnit: 0 });

  const result = await useCase.computePricing([{ productId: 1, quantity: 1 }], {}, settings as never);

  expect(result.warnings).toEqual([expect.objectContaining({ itemIndex: 0, hasManualPrice: false, marginPct: 10 })]);
});

it('con aroma el minimo del campo manual descuenta el recargo que se suma despues', async () => {
  const { useCase, settings } = buildPricing();

  const result = await useCase.computePricing([
    { productId: 1, quantity: 1, withFragrance: true, fragranceSupplyId: 2, unitPriceOverride: 40 },
  ], {}, settings as never);

  const [warning] = result.warnings;
  expect(warning.minManualPrice).toBeCloseTo(warning.minUnitPrice - 5, 2);
});

it('un renglon que cumple el piso no genera aviso', async () => {
  const { useCase, settings } = buildPricing();

  const result = await useCase.computePricing([{ productId: 1, quantity: 1 }], {}, settings as never);

  expect(result.warnings).toEqual([]);
});

it('pasa el costo y unidad del aroma y su configuracion al costeo por renglon', async () => {
  const { useCase, settings, lineCosting } = buildPricing();

  const result = await useCase.computePricing([
    { productId: 1, quantity: 1, withFragrance: true, fragranceSupplyId: 2 },
    { productId: 1, quantity: 1 },
  ], {}, settings as never);

  expect(lineCosting.costLine).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({
    withFragrance: true, fragranceUnitCost: 3, fragranceUnit: { slug: 'MILLILITER', abbr: 'ml' },
  }), expect.objectContaining({ fragranceSurcharge: 5, fragranceDropsPer100g: 10, fragranceRealCost: true }));
  expect(lineCosting.costLine).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({
    withFragrance: false, fragranceUnitCost: null, fragranceUnit: null,
  }), expect.anything());
  expect(result.costings[0].fragranceMlPerUnit).toBe(1.25);
});
