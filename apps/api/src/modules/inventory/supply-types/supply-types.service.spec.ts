import { SupplyTypeRepository } from './supply-type.repository';
import { SupplyTypesService } from './supply-types.service';
import { UnitOfMeasureRepository } from '../units-of-measure/unit-of-measure.repository';
import { UnitsOfMeasureService } from '../units-of-measure/units-of-measure.service';

// Ya no hay filas "de sistema": el tipo que cuenta como cera o como aroma lo
// decide Settings por id (waxSupplyTypeId/fragranceSupplyTypeId), asi que
// cualquier fila del catalogo -- incluidas las 17+8 que sembro la
// migracion original -- se puede renombrar, cambiar de slug o dar de baja
// igual que una creada por el usuario. Lo unico que sigue protegido es no
// dejar un insumo sin tipo/unidad.
describe.each(['supply-types', 'units-of-measure'])('%s', (catalog) => {
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
    repository.findById.mockResolvedValue({ id: 1, slug: 'WAX' });
    repository.countDependents.mockResolvedValue(0);
  });

  it('permite renombrar y cambiar el slug de cualquier fila, incluida una sembrada por la migracion', async () => {
    const dto = { slug: 'CERA', name: 'Cera de parafina', sortOrder: 20 };
    await service.update(1, dto);
    expect(repository.update).toHaveBeenCalledWith(1, dto);
  });

  it('bloquea dar de baja una fila con insumos dependientes y permite una sin uso', async () => {
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
