// La landing manda supplyId + valor; solo cuentan los insumos marcados "Indicar
// en cotizacion" que estan en el BOM del producto, y el label sale de la BD.
import { SettingsService } from '../../settings/settings.service';
import { QuoteRequestRepository } from './quote-request.repository';
import { cleanExtraFields, QuoteRequestsService } from './quote-requests.service';

const bom = [
  { supply: { id: 5, quoteFieldLabel: 'Color del liston' } },
  { supply: { id: 6, quoteFieldLabel: null } },
];

test('descarta insumos ajenos al BOM, sin label, vacios y duplicados; el label viene de la BD', () => {
  const result = cleanExtraFields(
    [
      { supplyId: 5, value: '  rosa palo ' },
      { supplyId: 5, value: 'azul' },
      { supplyId: 99, value: 'ajeno' },
      { supplyId: 6, value: 'sin etiqueta' },
    ],
    bom,
  );
  expect(result).toEqual([{ supplyId: 5, label: 'Color del liston', value: 'rosa palo' }]);
});

test('valor en blanco o sin extraFields no genera nada', () => {
  expect(cleanExtraFields([{ supplyId: 5, value: '   ' }], bom)).toEqual([]);
  expect(cleanExtraFields(undefined, bom)).toEqual([]);
});

describe('deletePermanently', () => {
  const repository = {
    findById: jest.fn(),
    delete: jest.fn(),
  };
  const service = new QuoteRequestsService(
    repository as unknown as QuoteRequestRepository,
    {} as SettingsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('bloquea el borrado permanente de una solicitud activa', async () => {
    repository.findById.mockResolvedValue({ id: 1, isActive: true });

    await expect(service.deletePermanently(1)).rejects.toMatchObject({
      status: 400, response: { code: 'MUST_BE_INACTIVE' },
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('borra permanentemente una solicitud inactiva', async () => {
    const request = { id: 1, isActive: false };
    repository.findById.mockResolvedValue(request);
    repository.delete.mockResolvedValue(request);

    await expect(service.deletePermanently(1)).resolves.toEqual(request);
    expect(repository.delete).toHaveBeenCalledWith(1);
  });
});

describe('lista compartida', () => {
  const repository = {
    findQuotableProducts: jest.fn(),
    findQuotableFragrances: jest.fn(),
    createShared: jest.fn(),
    findShared: jest.fn(),
  };
  const service = new QuoteRequestsService(
    repository as unknown as QuoteRequestRepository,
    {} as SettingsService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('guarda nombre, slug e imagen del repositorio y devuelve un token, sin pedir contacto', async () => {
    repository.findQuotableProducts.mockResolvedValue([
      { id: 3, name: 'Vela de soya', slug: 'vela-de-soya', allowsFragrance: false, supplies: [], images: [{ url: '/uploads/vela.webp' }] },
    ]);
    repository.createShared.mockImplementation(({ token }) => Promise.resolve({ token }));

    const result = await service.createShared({ items: [{ productId: 3, quantity: 10 }] });

    expect(result.token).toHaveLength(11);
    expect(repository.createShared).toHaveBeenCalledWith({
      token: result.token,
      eventDate: null,
      items: [expect.objectContaining({ productName: 'Vela de soya', slug: 'vela-de-soya', imageUrl: '/uploads/vela.webp' })],
    });
  });

  it('responde 404 si la lista no existe', async () => {
    repository.findShared.mockResolvedValue(null);

    await expect(service.findShared('no-existe')).rejects.toMatchObject({
      status: 404, response: { code: 'SHARED_QUOTE_NOT_FOUND' },
    });
  });

  it('no expone ids de insumos', async () => {
    repository.findShared.mockResolvedValue({
      id: 1,
      token: 'abc',
      eventDate: new Date('2026-10-01T00:00:00Z'),
      createdAt: new Date('2026-09-01T12:00:00Z'),
      items: [
        {
          productId: 3,
          slug: 'vela-de-soya',
          productName: 'Vela de soya',
          imageUrl: null,
          quantity: 10,
          candleColor: null,
          extraFields: [{ supplyId: 5, label: 'Color del liston', value: 'rosa palo' }],
          withFragrance: true,
          fragranceSupplyId: 8,
          fragranceName: 'Lavanda',
        },
      ],
    });

    const result = await service.findShared('abc');

    expect(result.eventDate).toBe('2026-10-01');
    expect(result.items[0].extraFields).toEqual([{ label: 'Color del liston', value: 'rosa palo' }]);
    expect(JSON.stringify(result)).not.toMatch(/supplyId|fragranceSupplyId/);
  });
});
