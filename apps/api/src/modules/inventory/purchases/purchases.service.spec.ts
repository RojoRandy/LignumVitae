import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

it.each(['', undefined, 'Descripcion manual'])('guarda descripciones con entrada %p', async (description) => {
  const dto = plainToInstance(CreatePurchaseDto, {
    purchasedAt: '2026-09-15',
    items: [
      { kind: 'SUPPLY', supplyId: 1 },
      { kind: 'ASSET', assetName: 'Molde floral' },
      { kind: 'EXPENSE', expenseCategoryId: 2 },
    ].map((item) => ({ ...item, description, packsQty: 1, baseQtyPerPack: 1, pricePerPack: 100 })),
  });
  expect(await validate(dto)).toEqual([]);

  const tx = {
    purchase: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    supply: { findUniqueOrThrow: jest.fn().mockResolvedValue({ name: 'Parafina' }) },
    expenseCategory: { findUniqueOrThrow: jest.fn().mockResolvedValue({ name: 'Servicios' }) },
    asset: { create: jest.fn().mockResolvedValue({ id: 3 }) },
    purchaseItem: { create: jest.fn().mockResolvedValue({ id: 4 }) },
    stockMovement: { create: jest.fn() },
    expense: { create: jest.fn() },
  };
  const service = new PurchasesService(
    { runInTransaction: (fn: (client: typeof tx) => unknown) => fn(tx), findById: jest.fn().mockResolvedValue({ id: 1 }) } as never,
    { recalculateStock: jest.fn() } as never,
    { recalculateSuggestedCost: jest.fn() } as never,
    { next: jest.fn().mockResolvedValue('COMP-1') } as never,
    { get: jest.fn().mockResolvedValue({ defaultAssetUsefulLifeMonths: 12 }) } as never,
  );

  await service.create(dto);

  expect(tx.purchaseItem.create.mock.calls.map(([args]) => args.data.description)).toEqual(
    ['Parafina', 'Molde floral', 'Servicios'].map((name) => description || name),
  );
  expect(tx.expense.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ description: description || 'Servicios' }),
  }));
  expect(tx.asset.create).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ name: 'Molde floral' }),
  }));
});

it('rechaza un renglon sin descripcion y sin origen del que derivarla', async () => {
  const dto = plainToInstance(CreatePurchaseDto, {
    purchasedAt: '2026-09-15',
    items: [{ kind: 'ASSET', description: '', packsQty: 1, baseQtyPerPack: 1, pricePerPack: 100 }],
  });
  const tx = { purchase: { create: jest.fn().mockResolvedValue({ id: 1 }) }, asset: { create: jest.fn() }, purchaseItem: { create: jest.fn() } };
  const service = new PurchasesService(
    { runInTransaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never,
    {} as never,
    {} as never,
    { next: jest.fn().mockResolvedValue('COMP-1') } as never,
    { get: jest.fn().mockResolvedValue({ defaultAssetUsefulLifeMonths: 12 }) } as never,
  );

  await expect(service.create(dto)).rejects.toMatchObject({
    status: 400,
    response: { code: 'PURCHASE_ITEM_NEEDS_DESCRIPTION' },
  });
  expect(tx.asset.create).not.toHaveBeenCalled();
});

describe('cancelar una compra', () => {
  const buildService = (purchase: unknown, tx: Record<string, unknown>) =>
    new PurchasesService(
      {
        findById: jest.fn().mockResolvedValue(purchase),
        runInTransaction: (fn: (client: typeof tx) => unknown) => fn(tx),
      } as never,
      { recalculateStock: jest.fn() } as never,
      { recalculateSuggestedCost: jest.fn() } as never,
      {} as never,
      {} as never,
    );

  it('no revierte dos veces una compra ya cancelada', async () => {
    const tx = { purchase: { update: jest.fn() } };
    const service = buildService({ id: 1, isActive: false, items: [] }, tx);

    await service.deactivate(1);

    expect(tx.purchase.update).not.toHaveBeenCalled();
  });

  it('rechaza cancelar una compra de un mes cerrado', async () => {
    const tx = {
      purchase: { update: jest.fn() },
      overheadPeriod: { findUnique: jest.fn().mockResolvedValue({ closedAt: new Date('2026-02-01') }) },
    };
    const service = buildService({ id: 1, isActive: true, purchasedAt: new Date('2026-01-15'), items: [] }, tx);

    await expect(service.deactivate(1)).rejects.toMatchObject({
      status: 400,
      response: { code: 'PERIOD_CLOSED', data: { year: 2026, month: 1 } },
    });
    expect(tx.purchase.update).not.toHaveBeenCalled();
  });

  it('revierte stock, gasto y activo de una compra viva', async () => {
    const tx = {
      purchase: { update: jest.fn() },
      overheadPeriod: { findUnique: jest.fn().mockResolvedValue(null) },
      stockMovement: { findMany: jest.fn().mockResolvedValue([{ id: 9, supplyId: 4 }]), update: jest.fn() },
      expense: { updateMany: jest.fn() },
      asset: { update: jest.fn() },
      purchaseItem: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = buildService(
      {
        id: 1,
        isActive: true,
        purchasedAt: new Date('2026-09-15'),
        items: [
          { id: 10, kind: 'SUPPLY', supplyId: 4 },
          { id: 11, kind: 'ASSET', assetId: 7, packsQty: 3, lineTotal: 900 },
        ],
      },
      tx,
    );

    await service.deactivate(1);

    expect(tx.stockMovement.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { isActive: false } });
    expect(tx.expense.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false } }));
    // Decrementa exactamente lo que ese renglon sumo...
    expect(tx.asset.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { quantity: { decrement: 3 }, totalCost: { decrement: 900 } },
    });
    // ...y como no le quedan renglones vivos, el activo se da de baja.
    expect(tx.asset.update).toHaveBeenLastCalledWith({ where: { id: 7 }, data: { isActive: false } });
  });
});
