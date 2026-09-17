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
  const service = new ProductsService(
    { findById: jest.fn().mockResolvedValue(product), replaceSupplies } as never,
    {} as never, // candleRepository: el BOUQUET sale de product.components
    { findById: jest.fn() } as never,
    { findById: jest.fn() } as never,
    { execute: jest.fn() } as never,
    { get: jest.fn().mockResolvedValue({ waxSupplyTypeId: 1 }) } as never,
    { findById: jest.fn().mockResolvedValue({ id: 99, typeId: supplyTypeId }) } as never,
  );
  return { service, replaceSupplies };
};

// applySuppliesFromTemplatesAndManual es privado a proposito: se llega a el por
// reapplyTemplates, que es la puerta publica mas corta.
const reapply = (service: ProductsService) => service.reapplyTemplates(1);

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
