import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FindQuotationsQueryDto } from './dto/find-quotations.query.dto';
import { QuotationRepository } from './quotation.repository';
import { QuotationsService } from './quotations.service';
import { CreateQuotationUseCase } from './usecases/create-quotation.usecase';
import { DuplicateQuotationUseCase } from './usecases/duplicate-quotation.usecase';

describe('deletePermanently', () => {
  const repository = {
    expireOverdue: jest.fn(),
    findById: jest.fn(),
    deletePermanently: jest.fn(),
  };
  const service = new QuotationsService(
    repository as unknown as QuotationRepository,
    {} as CreateQuotationUseCase,
    {} as DuplicateQuotationUseCase,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('bloquea el borrado permanente de una cotizacion activa', async () => {
    repository.findById.mockResolvedValue({ id: 1, isActive: true, order: null });

    await expect(service.deletePermanently(1)).rejects.toMatchObject({
      status: 400, response: { code: 'MUST_BE_INACTIVE' },
    });
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('bloquea el borrado permanente de una cotizacion inactiva con pedido', async () => {
    repository.findById.mockResolvedValue({ id: 1, isActive: false, order: { id: 2, folio: 'PED-2026-0001' } });

    await expect(service.deletePermanently(1)).rejects.toMatchObject({
      status: 409, response: { code: 'QUOTATION_ALREADY_CONVERTED' },
    });
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('borra permanentemente una cotizacion inactiva sin pedido', async () => {
    const quotation = { id: 1, isActive: false, order: null };
    repository.findById.mockResolvedValue(quotation);
    repository.deletePermanently.mockResolvedValue(quotation);

    await expect(service.deletePermanently(1)).resolves.toEqual(quotation);
    expect(repository.deletePermanently).toHaveBeenCalledWith(1);
  });
});

describe('findAll', () => {
  const repository = {
    expireOverdue: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const service = new QuotationsService(
    repository as unknown as QuotationRepository,
    {} as CreateQuotationUseCase,
    {} as DuplicateQuotationUseCase,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('filtra por varios estados con status: { in }', async () => {
    repository.findMany.mockResolvedValue([]);
    repository.count.mockResolvedValue(0);

    await service.findAll({ status: ['DRAFT', 'EXPIRED'] } as never);

    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { in: ['DRAFT', 'EXPIRED'] } }) }),
    );
  });
});

describe('FindQuotationsQueryDto.status', () => {
  const parse = (status: string) => {
    const dto = plainToInstance(FindQuotationsQueryDto, { status });
    return { dto, errors: validateSync(dto) };
  };

  it('parte la lista separada por coma', () => {
    const { dto, errors } = parse('DRAFT,EXPIRED');
    expect(errors).toHaveLength(0);
    expect(dto.status).toEqual(['DRAFT', 'EXPIRED']);
  });

  it('un solo valor sigue funcionando', () => {
    const { dto, errors } = parse('DRAFT');
    expect(errors).toHaveLength(0);
    expect(dto.status).toEqual(['DRAFT']);
  });

  it('rechaza un estado que no existe', () => {
    expect(parse('DRAFT,NOPE').errors).toHaveLength(1);
  });
});
