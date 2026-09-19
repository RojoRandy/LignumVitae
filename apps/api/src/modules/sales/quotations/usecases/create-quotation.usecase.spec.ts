// La solicitud web queda CONVERTED en la misma transaccion que crea la
// cotizacion; si ya no estaba en NEW, la transaccion completa se cae.
import { ConflictException } from '@nestjs/common';
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
    costings: [{}],
    totalWaxGrams: 0,
  } as never);
  return { useCase, tx, quoteRequestRepository };
};

const dto = { customerId: 1, quoteRequestId: 7, items: [{ productId: 1, quantity: 1 }] };

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
