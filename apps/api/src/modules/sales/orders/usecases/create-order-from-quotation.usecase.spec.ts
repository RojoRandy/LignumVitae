import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { CreateOrderFromQuotationUseCase } from './create-order-from-quotation.usecase';

const build = (status: QuotationStatus, order: { id: number } | null = null) => {
  const quotation = {
    id: 7,
    status,
    order,
    customerId: 1,
    eventDate: null,
    items: [{
      productId: 1,
      product: { name: 'Vela' },
      quantity: 2,
      fragranceMlPerUnit: new Prisma.Decimal(1.25),
      unitSupplyCost: 10,
      unitLaborCost: 5,
      unitOverheadCost: 3,
      unitTotalCost: 18,
    }],
  };
  const tx = {
    order: { create: jest.fn().mockResolvedValue({ id: 10 }) },
    orderItem: { createMany: jest.fn() },
    quotation: { update: jest.fn() },
  };
  const quotationRepository = {
    expireOverdue: jest.fn(),
    findById: jest.fn().mockResolvedValue(quotation),
    runInTransaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const useCase = new CreateOrderFromQuotationUseCase(
    quotationRepository as never,
    { findById: jest.fn().mockResolvedValue({ id: 10 }) } as never,
    { get: jest.fn().mockResolvedValue({ minLeadTimeDays: 7, orderFolioPrefix: 'PED' }) } as never,
    { next: jest.fn().mockResolvedValue('PED-2026-0001') } as never,
  );
  return { useCase, tx };
};

it('convierte un borrador sin pedido y marca la cotizacion ACCEPTED', async () => {
  const { useCase, tx } = build('DRAFT');

  await expect(useCase.execute({ quotationId: 7 })).resolves.toEqual({ id: 10 });

  expect(tx.order.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ quotationId: 7, status: 'PENDING_DEPOSIT' }),
  });
  expect(tx.orderItem.createMany).toHaveBeenCalledWith({
    data: [expect.objectContaining({ fragranceMlPerUnit: new Prisma.Decimal(1.25) })],
  });
  expect(tx.quotation.update).toHaveBeenCalledWith({
    where: { id: 7 },
    data: { status: 'ACCEPTED', acceptedAt: expect.any(Date) },
  });
});

it('rechaza una cotizacion REJECTED sin crear pedido', async () => {
  const { useCase, tx } = build('REJECTED');
  const result = useCase.execute({ quotationId: 7 });

  await expect(result).rejects.toBeInstanceOf(BadRequestException);
  await expect(result).rejects.toMatchObject({
    response: { code: 'QUOTATION_NOT_ACCEPTABLE', data: { id: 7, status: 'REJECTED' } },
  });
  expect(tx.order.create).not.toHaveBeenCalled();
});

it('rechaza un borrador que ya tiene pedido', async () => {
  const { useCase, tx } = build('DRAFT', { id: 10 });
  const result = useCase.execute({ quotationId: 7 });

  await expect(result).rejects.toBeInstanceOf(ConflictException);
  await expect(result).rejects.toMatchObject({
    response: { code: 'QUOTATION_ALREADY_CONVERTED', data: { id: 7 } },
  });
  expect(tx.order.create).not.toHaveBeenCalled();
});
