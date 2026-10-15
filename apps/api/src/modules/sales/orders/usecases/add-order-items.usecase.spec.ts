import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AddOrderItemsUseCase } from './add-order-items.usecase';

const D = (value: number | string) => new Prisma.Decimal(value);

// Catalogo actual: el producto ya subio de precio desde la cotizacion
// (menudeo 22, mayoreo 18) contra lo que se cotizo (menudeo 20).
const product = { id: 1, name: 'Osito', retailListPrice: D(22), wholesaleListPrice: D(18), retailPriceOverride: null, wholesalePriceOverride: null };

const build = (opts: { discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number } } = {}) => {
  const order = {
    id: 10,
    status: 'CONFIRMED',
    quotationId: 7,
    priceTier: 'RETAIL',
    shippingCost: D(0),
    discountAmount: D(0),
    totalWaxGrams: D(1500),
    items: [
      {
        id: 20,
        productId: 1,
        sortOrder: 0,
        quantity: 15,
        withFragrance: true,
        unitListPrice: D(20),
        unitPrice: D(21),
        unitTotalCost: D(8),
        unitSupplyCost: D(4),
        unitLaborCost: D(3),
        unitOverheadCost: D(1),
        lineCost: D(120),
      },
    ],
  };
  const quotation = {
    fragranceSurcharge: D(1),
    wholesaleThresholdQty: 20,
    depositPct: D(40),
    roundingMultiple: D(10),
    accumulatePieces: true,
    discountEnabled: Boolean(opts.discount),
    discountType: opts.discount?.type ?? 'PERCENTAGE',
    discountValue: D(opts.discount?.value ?? 0),
  };
  const tx = { orderItem: { update: jest.fn(), createMany: jest.fn() }, order: { update: jest.fn() } };
  const orderRepository = {
    findById: jest.fn().mockResolvedValue(order),
    runInTransaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const computePricing = jest.fn((items: { productId: number }[]) =>
    Promise.resolve({
      costings: items.map(() => ({
        unitTotalCost: 8, unitSupplyCost: 4, unitLaborCost: 3, unitOverheadCost: 1, unitWaxCost: 1, unitFragranceCost: 0,
        waxGramsPerUnit: 100, laborMinutesPerUnit: 2, fragranceMlPerUnit: 0, resolvedSupplies: [],
      })),
      productMap: new Map([[1, product]]),
      totalWaxGrams: items.length * 100,
    }),
  );
  const useCase = new AddOrderItemsUseCase(
    orderRepository as never,
    { findById: jest.fn().mockResolvedValue(quotation) } as never,
    { findManyByIds: jest.fn().mockResolvedValue([product]) } as never,
    { findMany: jest.fn().mockResolvedValue([]) } as never,
    { get: jest.fn().mockResolvedValue({ minMarginPct: D(0) }) } as never,
    { computePricing } as never,
  );
  return { useCase, order, tx, computePricing };
};

it('al cruzar a mayoreo, lo existente toma el precio de mayoreo del catalogo actual', async () => {
  const { useCase } = build();
  const preview = await useCase.plan(10, { items: [{ productId: 1, quantity: 10 }] });

  expect(preview.priceTier).toBe('WHOLESALE');
  expect(preview.totalQuantity).toBe(25);
  expect(preview.existing).toEqual([{ itemId: 20, previousUnitPrice: 21, unitPrice: 19, lineTotal: 285, tierChanged: true }]);
  expect(preview.added).toEqual([{ index: 0, priceTier: 'WHOLESALE', unitPrice: 18, lineTotal: 180, lineMargin: 100, fragranceMlPerUnit: 0 }]);
  expect(preview.subtotal).toBe(465);
  expect(preview.total).toBe(465);
});

it('sin cruzar el umbral, lo existente conserva su precio aunque el catalogo haya cambiado', async () => {
  const { useCase } = build();
  const preview = await useCase.plan(10, { items: [{ productId: 1, quantity: 2 }] });

  expect(preview.priceTier).toBe('RETAIL');
  expect(preview.existing[0]).toMatchObject({ unitPrice: 21, lineTotal: 315, tierChanged: false });
  expect(preview.added[0]).toMatchObject({ unitPrice: 22 });
});

it('el precio final capturado gana, con el aroma ya incluido', async () => {
  const { useCase, tx } = build();
  await useCase.execute(10, { items: [{ productId: 1, quantity: 2 }], existingPrices: [{ itemId: 20, unitPrice: 18 }] });

  expect(tx.orderItem.update).toHaveBeenCalledWith({
    where: { id: 20 },
    data: { unitListPrice: 22, unitPrice: 18, priceVariance: -5, lineTotal: 270, lineMargin: 150 },
  });
});

it('reaplica el descuento en porcentaje y recalcula el anticipo redondeado hacia arriba', async () => {
  const { useCase, tx, order } = build({ discount: { type: 'PERCENTAGE', value: 10 } });
  await useCase.execute(10, { items: [{ productId: 1, quantity: 2 }] });

  // subtotal 315 + 44 = 359; descuento 35.90; total 323.10; anticipo 40% = 129.24 -> 130
  const data = tx.order.update.mock.calls[0][0].data;
  expect(data).toMatchObject({ subtotal: 359, discountAmount: 35.9, total: 323.1, depositAmount: 130, totalQuantity: 17 });
  expect(data.totalCost).toBe(136);
  expect(data.grossProfit).toBe(187.1);
  expect(data.totalWaxGrams).toBe(1600);
  expect(tx.orderItem.update).not.toHaveBeenCalled();
  const created = tx.orderItem.createMany.mock.calls[0][0].data;
  expect(created).toHaveLength(1);
  expect(created[0]).toMatchObject({ orderId: order.id, sortOrder: 1, productName: 'Osito', quantity: 2, lineTotal: 44 });
});

it('rechaza un pedido cancelado', async () => {
  const { useCase, order, computePricing } = build();
  order.status = 'CANCELLED';
  const result = useCase.plan(10, { items: [{ productId: 1, quantity: 2 }] });

  await expect(result).rejects.toBeInstanceOf(BadRequestException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_NOT_EDITABLE' } });
  expect(computePricing).not.toHaveBeenCalled();
});

it('rechaza un precio para un renglon de otro pedido', async () => {
  const { useCase } = build();
  const result = useCase.plan(10, { items: [{ productId: 1, quantity: 2 }], existingPrices: [{ itemId: 99, unitPrice: 10 }] });

  await expect(result).rejects.toBeInstanceOf(NotFoundException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_NOT_FOUND' } });
});
