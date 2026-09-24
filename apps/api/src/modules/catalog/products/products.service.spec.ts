// Los dos huecos de herencia que cerro el paso C2 del plan: un BOUQUET no
// heredaba NADA de sus velas (sus insumos no se cobraban en ningun lado) y un
// insumo de cera podia colarse como adicional, cobrandose dos veces porque la
// cera ya se deriva de los gramos de la vela.
import { ProductsService } from './products.service';

const candleTemplate = (supplyId: number, quantity: number) => ({
  supplyId,
  quantity: { toNumber: () => quantity },
  unitId: 7,
  note: null,
});

// El tipo "cera" se decide por id (Settings.waxSupplyTypeId), no por el
// texto de un slug -- por eso el mock trae un typeId, no un type.slug.
const build = ({ product, supplyTypeId = 3 }: { product: unknown; supplyTypeId?: number }) => {
  const replaceSupplies = jest.fn();
  const storage = { save: jest.fn().mockResolvedValue('/static/test.jpg'), remove: jest.fn() };
  const repository = {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    countDependents: jest.fn().mockResolvedValue({ quotationItemsCount: 0, orderItemsCount: 0 }),
    deletePermanently: jest.fn(),
    addImage: jest.fn(),
    findImage: jest.fn().mockResolvedValue({ url: '/static/test.jpg' }),
    clearCategoryCovers: jest.fn(),
    removeImage: jest.fn(),
    findById: jest.fn().mockResolvedValue(product),
    replaceSupplies,
    update: jest.fn().mockImplementation(async (_id, data) => Object.assign(product as object, data)),
  };
  const service = new ProductsService(
    repository as never,
    { findById: jest.fn().mockResolvedValue({ supplyTemplate: [candleTemplate(10, 1)] }) } as never,
    { findById: jest.fn().mockResolvedValue({ supplyTemplate: [candleTemplate(20, 1)] }) } as never,
    { findById: jest.fn().mockResolvedValue({ supplyTemplate: [candleTemplate(30, 1), candleTemplate(40, 1)] }) } as never,
    { execute: jest.fn() } as never,
    { get: jest.fn().mockResolvedValue({ waxSupplyTypeId: 1 }) } as never,
    { findById: jest.fn().mockResolvedValue({ id: 99, typeId: supplyTypeId }) } as never,
    storage as never,
  );
  return { service, replaceSupplies, storage, repository };
};

// applySuppliesFromTemplatesAndManual es privado a proposito: se llega a el por
// reapplyTemplates, que es la puerta publica mas corta.
const reapply = (service: ProductsService) => service.reapplyTemplates(1);

it('convierte newUntil a Date al actualizar el producto', async () => {
  const { service, repository } = build({ product: { id: 1 } });

  await service.update(1, { newUntil: '2026-10-01T00:00:00.000Z' });

  expect(repository.update).toHaveBeenCalledWith(1, { newUntil: new Date('2026-10-01T00:00:00.000Z') });
  expect(repository.update.mock.calls[0][1].newUntil).toBeInstanceOf(Date);
});

it('permite quitar newUntil con null al actualizar el producto', async () => {
  const { service, repository } = build({ product: { id: 1, newUntil: new Date('2026-10-01T00:00:00.000Z') } });

  await service.update(1, { newUntil: null });

  expect(repository.update).toHaveBeenCalledWith(1, { newUntil: null });
});

it('omite la llave newUntil cuando no viene en la actualizacion', async () => {
  const { service, repository } = build({ product: { id: 1, newUntil: new Date('2026-10-01T00:00:00.000Z') } });

  await service.update(1, { description: 'Descripcion actualizada' });

  expect(repository.update).toHaveBeenCalledWith(1, { description: 'Descripcion actualizada' });
  expect(repository.update.mock.calls[0][1]).not.toHaveProperty('newUntil');
});

it('un ramo hereda los insumos de cada vela y suma las repetidas', async () => {
  const { service, replaceSupplies } = build({
    product: {
      id: 1,
      kind: 'BOUQUET',
      supplies: [],
      components: [
        { quantity: 2, candle: { supplyTemplate: [candleTemplate(10, 1), candleTemplate(20, 0.5)] } },
        { quantity: 3, candle: { supplyTemplate: [candleTemplate(10, 1)] } },
      ],
    },
  });

  await reapply(service);

  const written = replaceSupplies.mock.calls[0][1] as { supplyId: number; quantity: number }[];
  // La mecha va en las dos velas: 1x2 + 1x3 = 5, un solo renglon.
  expect(written).toEqual([
    expect.objectContaining({ supplyId: 10, quantity: 5, source: 'CANDLE_TEMPLATE' }),
    expect.objectContaining({ supplyId: 20, quantity: 1, source: 'CANDLE_TEMPLATE' }),
  ]);
});

it('rechaza un insumo de cera entre los adicionales', async () => {
  const { service, replaceSupplies } = build({
    product: {
      id: 1,
      kind: 'SIMPLE',
      components: [],
      supplies: [{ supplyId: 99, quantity: { toNumber: () => 1 }, unitId: 7, note: null, source: 'MANUAL' }],
    },
    supplyTypeId: 1, // coincide con el waxSupplyTypeId mockeado en build()
  });

  await expect(reapply(service)).rejects.toMatchObject({
    status: 400,
    response: { code: 'SUPPLY_IS_WAX' },
  });
  expect(replaceSupplies).not.toHaveBeenCalled();
});

it.each(['SIMPLE', 'BOUQUET'])('excluye plantillas de %s al guardar y reaplicar, conservando MANUAL', async (kind) => {
  const product = {
    id: 1, kind, candleId: kind === 'SIMPLE' ? 1 : null,
    packagingTypeId: 2, cardTypeId: 3, excludedSupplyIds: [],
    components: [{ quantity: 2, candle: { supplyTemplate: [candleTemplate(10, 1)] } }],
    supplies: [{ ...candleTemplate(30, 3), source: 'MANUAL' }],
  };
  const { service, replaceSupplies } = build({ product });

  await service.update(1, { excludedSupplyIds: [10, 20, 30] });
  expect(product.excludedSupplyIds).toEqual([10, 20, 30]);
  const expected = [
    expect.objectContaining({ supplyId: 40, source: 'CARD_TEMPLATE' }),
    expect.objectContaining({ supplyId: 30, quantity: 3, source: 'MANUAL' }),
  ];
  expect(replaceSupplies).toHaveBeenLastCalledWith(1, expected);

  await service.update(1, { additionalSupplies: [{ supplyId: 30, quantity: 3, unitId: 7 }] });
  expect(replaceSupplies).toHaveBeenLastCalledWith(1, expected);
  await reapply(service);
  expect(replaceSupplies).toHaveBeenLastCalledWith(1, expected);

  await service.update(1, { excludedSupplyIds: [] });
  expect(replaceSupplies).toHaveBeenLastCalledWith(1, [
    expect.objectContaining({ supplyId: 10, source: 'CANDLE_TEMPLATE' }),
    expect.objectContaining({ supplyId: 20, source: 'PACKAGING_TEMPLATE' }),
    expect.objectContaining({ supplyId: 30, quantity: 3, source: 'MANUAL' }),
    expect.objectContaining({ supplyId: 40, source: 'CARD_TEMPLATE' }),
  ]);
});


it('rechaza la imagen 11 antes de escribir en storage', async () => {
  const { service, storage, repository } = build({ product: { images: Array(10).fill({}) } });
  await expect(service.addImage(1, { buffer: Buffer.from('image'), mimetype: 'image/jpeg' })).rejects.toMatchObject({
    status: 400, response: { code: 'PRODUCT_IMAGE_LIMIT_REACHED' },
  });
  expect(storage.save).not.toHaveBeenCalled();
  expect(repository.addImage).not.toHaveBeenCalled();
});

it('guarda la imagen 10 con la URL publica y el indicador principal', async () => {
  const { service, storage, repository } = build({ product: { images: Array(9).fill({}) } });
  const file = { buffer: Buffer.from('image'), mimetype: 'image/jpeg' };
  await service.addImage(1, file, true);
  expect(storage.save).toHaveBeenCalledWith(file.buffer, file.mimetype);
  expect(repository.addImage).toHaveBeenCalledWith(1, { url: '/static/test.jpg', isPrimary: true });
});

it('borra el objeto antes de borrar la fila de la imagen', async () => {
  const { service, storage, repository } = build({ product: {} });
  await service.removeImage(2);
  expect(storage.remove).toHaveBeenCalledWith('/static/test.jpg');
  expect(repository.removeImage).toHaveBeenCalledWith(2);
  expect(storage.remove.mock.invocationCallOrder[0]).toBeLessThan(repository.removeImage.mock.invocationCallOrder[0]);
});


it('limpia las portadas de categoria antes de borrar la fila de la imagen', async () => {
  const { service, storage, repository } = build({ product: {} });
  await service.removeImage(2);
  expect(repository.clearCategoryCovers).toHaveBeenCalledWith(['/static/test.jpg']);
  expect(repository.removeImage).toHaveBeenCalledWith(2);
  expect(storage.remove.mock.invocationCallOrder[0]).toBeLessThan(repository.clearCategoryCovers.mock.invocationCallOrder[0]);
  expect(repository.clearCategoryCovers.mock.invocationCallOrder[0]).toBeLessThan(repository.removeImage.mock.invocationCallOrder[0]);
});

it('rechaza eliminar permanentemente un producto activo', async () => {
  const { service, storage, repository } = build({ product: { isActive: true, images: [] } });
  await expect(service.deletePermanently(1)).rejects.toMatchObject({
    status: 400, response: { code: 'PRODUCT_MUST_BE_INACTIVE' },
  });
  expect(repository.countDependents).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
  expect(repository.deletePermanently).not.toHaveBeenCalled();
});

it.each([
  { quotationItemsCount: 2, orderItemsCount: 0 },
  { quotationItemsCount: 0, orderItemsCount: 3 },
  { quotationItemsCount: 2, orderItemsCount: 3 },
])('rechaza eliminar un producto con dependientes: %j', async (counts) => {
  const { service, storage, repository } = build({ product: { isActive: false, images: [{ url: '/static/test.jpg' }] } });
  repository.countDependents.mockResolvedValue(counts);
  await expect(service.deletePermanently(1)).rejects.toMatchObject({
    status: 409, response: { code: 'HAS_DEPENDENTS', data: counts },
  });
  expect(repository.countDependents).toHaveBeenCalledWith(1);
  expect(storage.remove).not.toHaveBeenCalled();
  expect(repository.deletePermanently).not.toHaveBeenCalled();
});

it('borra todas las imagenes de storage antes de eliminar el producto sin dependientes', async () => {
  const product = { id: 1, isActive: false, images: [{ url: '/static/one.jpg' }, { url: '/static/two.jpg' }] };
  const { service, storage, repository } = build({ product });
  repository.deletePermanently.mockResolvedValue(product);
  storage.remove.mockImplementation(async () => {
    await Promise.resolve();
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });
  await expect(service.deletePermanently(1)).resolves.toEqual(product);
  expect(repository.countDependents).toHaveBeenCalledWith(1);
  expect(storage.remove).toHaveBeenCalledTimes(2);
  expect(storage.remove).toHaveBeenNthCalledWith(1, '/static/one.jpg');
  expect(storage.remove).toHaveBeenNthCalledWith(2, '/static/two.jpg');
  expect(repository.deletePermanently).toHaveBeenCalledTimes(1);
  expect(repository.deletePermanently).toHaveBeenCalledWith(1);
});


it('limpia las portadas de categoria antes de eliminar el producto inactivo sin dependientes', async () => {
  const product = { id: 1, isActive: false, images: [{ url: '/static/one.jpg' }, { url: '/static/two.jpg' }] };
  const { service, storage, repository } = build({ product });
  await service.deletePermanently(1);
  expect(repository.clearCategoryCovers).toHaveBeenCalledWith(['/static/one.jpg', '/static/two.jpg']);
  expect(repository.deletePermanently).toHaveBeenCalledWith(1);
  expect(storage.remove.mock.invocationCallOrder[1]).toBeLessThan(repository.clearCategoryCovers.mock.invocationCallOrder[0]);
  expect(repository.clearCategoryCovers.mock.invocationCallOrder[0]).toBeLessThan(repository.deletePermanently.mock.invocationCallOrder[0]);
});

it.each([true, false])('combina la vela directa o del ramo con los demas filtros (onlyActive=%s)', async (onlyActive) => {
  const { service, repository } = build({ product: {} });

  await service.findAll({ candleId: 7, categoryId: 2, kind: 'BOUQUET', needsReview: false, search: 'rosa', onlyActive });

  const where = {
    ...(onlyActive ? { isActive: true } : {}),
    categoryId: 2,
    OR: [{ candleId: 7 }, { components: { some: { candleId: 7 } } }],
    kind: 'BOUQUET',
    needsReview: false,
    name: { contains: 'rosa', mode: 'insensitive' },
  };
  expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  expect(repository.count).toHaveBeenCalledWith(where);

  await service.findAll({ onlyActive });
  const unfilteredWhere = onlyActive ? { isActive: true } : {};
  expect(repository.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: unfilteredWhere }));
  expect(repository.count).toHaveBeenLastCalledWith(unfilteredWhere);
});


it.each([
  { highlight: 'featured' as const, filter: { isFeatured: true } },
  { highlight: 'hero' as const, filter: { images: { some: { showInHero: true } } } },
  { highlight: 'gallery' as const, filter: { images: { some: { showInGallery: true } } } },
  { highlight: 'new' as const, filter: { newUntil: { gt: expect.any(Date) } } },
])('combina highlight=$highlight con la vela directa o del ramo', async ({ highlight, filter }) => {
  const { service, repository } = build({ product: {} });

  await service.findAll({ candleId: 7, highlight });

  const where = {
    isActive: true,
    OR: [{ candleId: 7 }, { components: { some: { candleId: 7 } } }],
    ...filter,
  };
  expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  expect(repository.count).toHaveBeenCalledWith(where);
});

it.each([
  { sortBy: 'retailMargin' as const, orderBy: [{ retailMarginPct: 'desc' }, { name: 'asc' }] },
  { sortBy: 'wholesaleMargin' as const, orderBy: [{ wholesaleMarginPct: 'desc' }, { name: 'asc' }] },
  { sortBy: 'name' as const, orderBy: { name: 'asc' } },
  { sortBy: undefined, orderBy: { name: 'asc' } },
])('ordena los productos por $sortBy y conserva la paginacion', async ({ sortBy, orderBy }) => {
  const { service, repository } = build({ product: {} });

  await service.findAll({ sortBy, page: 2, limit: 10 });

  expect(repository.findMany).toHaveBeenCalledWith({ where: { isActive: true }, orderBy, skip: 10, take: 10 });
});

it.each([
  { minRetailMarginPct: 25.5 },
  { minRetailMarginPct: 0 },
  { minWholesaleMarginPct: 15.5 },
  { minWholesaleMarginPct: 0 },
  { minRetailMarginPct: 25.5, minWholesaleMarginPct: 15.5 },
])('combina los margenes minimos %j con los demas filtros', async (margins) => {
  const { service, repository } = build({ product: {} });

  await service.findAll({ candleId: 7, categoryId: 2, kind: 'BOUQUET', needsReview: false, search: 'rosa', ...margins });

  const where = {
    isActive: true,
    categoryId: 2,
    OR: [{ candleId: 7 }, { components: { some: { candleId: 7 } } }],
    kind: 'BOUQUET',
    needsReview: false,
    name: { contains: 'rosa', mode: 'insensitive' },
    ...(margins.minRetailMarginPct !== undefined ? { retailMarginPct: { gte: margins.minRetailMarginPct } } : {}),
    ...(margins.minWholesaleMarginPct !== undefined ? { wholesaleMarginPct: { gte: margins.minWholesaleMarginPct } } : {}),
  };
  expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
  expect(repository.count).toHaveBeenCalledWith(where);
});
