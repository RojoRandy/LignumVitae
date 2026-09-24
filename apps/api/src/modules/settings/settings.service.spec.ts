// El formulario envia todos los campos: solo un cambio de valor en costeo
// debe recalcular el catalogo, no la presencia del campo en el DTO.
import { SettingsService } from './settings.service';

const build = ({ before, after }: { before: unknown; after: unknown }) => {
  const repository = {
    get: jest.fn().mockResolvedValue(before),
    update: jest.fn().mockResolvedValue(after),
  };
  // SettingsService resuelve el recalculo por ModuleRef en tiempo de llamada
  // (SettingsModule tiene que seguir siendo una hoja), asi que el doble es un
  // ModuleRef falso cuyo get() devuelve el caso de uso.
  const useCase = { execute: jest.fn() };
  const moduleRef = { get: jest.fn().mockReturnValue(useCase) };
  const service = new SettingsService(repository as never, moduleRef as never);
  return { service, repository, execute: useCase.execute };
};

it('incluye legalName en la config publica sin exponer dailyWage ni waxSupplyId', async () => {
  const { service } = build({
    before: {
      legalName: 'Lignum Vitae SA de CV',
      dailyWage: 300,
      waxSupplyId: 1,
      depositPct: { toNumber: () => 50 },
    },
    after: {},
  });

  const result = await service.getPublic();

  expect(result.legalName).toBe('Lignum Vitae SA de CV');
  expect(result).not.toHaveProperty('dailyWage');
  expect(result).not.toHaveProperty('waxSupplyId');
});

it('recalcula una vez cuando cambia retailMarkupPct', async () => {
  const { service, execute } = build({
    before: { retailMarkupPct: 50 },
    after: { retailMarkupPct: 80 },
  });

  await service.update({ retailMarkupPct: 80 });

  expect(execute).toHaveBeenCalledTimes(1);
});

it('no recalcula al guardar el formulario completo si solo cambia phone', async () => {
  const before = {
    brandName: 'Lignum Vitae',
    phone: '8111111111',
    dailyWage: 300,
    workHoursPerDay: 8,
    meltBatchGrams: 1000,
    wholesaleThresholdQty: 12,
    overheadRateMode: 'FIXED' as const,
    overheadRatePerMinute: 2,
    waxSupplyId: 1,
    retailMarkupPct: 50,
    wholesaleMarkupPct: 30,
    roundingMultiple: 5,
    minMarginPct: 20,
  };
  const dto = { ...before, phone: '8222222222' };
  const { service, repository, execute } = build({ before, after: { ...dto } });

  await service.update(dto);

  expect(repository.update).toHaveBeenCalledWith(dto);
  expect(execute).not.toHaveBeenCalled();
});

it('no recalcula cuando cambia minMarginPct', async () => {
  const { service, execute } = build({
    before: { minMarginPct: 20 },
    after: { minMarginPct: 25 },
  });

  await service.update({ minMarginPct: 25 });

  expect(execute).not.toHaveBeenCalled();
});
