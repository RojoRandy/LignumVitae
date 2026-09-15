import { SupplyTypeRepository } from './supply-type.repository';
import { SupplyTypesService } from './supply-types.service';
import { UnitOfMeasureRepository } from '../units-of-measure/unit-of-measure.repository';
import { UnitsOfMeasureService } from '../units-of-measure/units-of-measure.service';

describe.each(['supply-types', 'units-of-measure'])('%s protections', (catalog) => {
  const repository = {
    findById: jest.fn(),
    countDependents: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  const service = catalog === 'supply-types'
    ? new SupplyTypesService(repository as unknown as SupplyTypeRepository)
    : new UnitsOfMeasureService(repository as unknown as UnitOfMeasureRepository);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue({ id: 1, slug: 'SYSTEM', isSystem: true });
    repository.countDependents.mockResolvedValue(0);
  });

  it('blocks system deletion and slug changes before writing', async () => {
    await expect(service.deactivate(1)).rejects.toMatchObject({
      status: 400, response: { code: 'SYSTEM_ROW_PROTECTED' },
    });
    await expect(service.update(1, { slug: 'CHANGED' })).rejects.toMatchObject({
      status: 400, response: { code: 'SYSTEM_ROW_PROTECTED' },
    });
    expect(repository.deactivate).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows system labels and ordering to change with the original slug', async () => {
    const dto = { slug: 'SYSTEM', name: 'Nuevo nombre', sortOrder: 20 };
    await service.update(1, dto);
    expect(repository.update).toHaveBeenCalledWith(1, dto);
    if (service instanceof UnitsOfMeasureService) {
      await service.update(1, { abbr: 'u' });
      expect(repository.update).toHaveBeenLastCalledWith(1, { abbr: 'u' });
    }
  });

  it('blocks dependent supplies and allows unused user rows to deactivate', async () => {
    repository.findById.mockResolvedValue({ id: 1, slug: 'CUSTOM', isSystem: false });
    repository.countDependents.mockResolvedValue(2);
    await expect(service.deactivate(1)).rejects.toMatchObject({
      status: 409, response: { code: 'HAS_DEPENDENTS' },
    });
    expect(repository.deactivate).not.toHaveBeenCalled();
    repository.countDependents.mockResolvedValue(0);
    await service.deactivate(1);
    expect(repository.deactivate).toHaveBeenCalledWith(1);
  });
});
