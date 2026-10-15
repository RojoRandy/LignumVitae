import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService, splitLineAmounts } from './orders.service';

const build = () => {
  const order = {
    id: 10,
    status: 'CONFIRMED' as OrderStatus,
    items: [
      {
        id: 20,
        orderId: 10,
        withFragrance: true,
        fragranceName: null as string | null,
        quantity: 31,
        sortOrder: 0,
        candleColor: 'Blanco' as string | null,
        unitPrice: '10.00',
        unitTotalCost: '3.333333',
        lineTotal: '310.00',
        lineCost: '103.33',
        extraFields: [],
        suppliesSnapshot: [],
      },
    ],
  };
  const supply = { id: 3, name: 'Lavanda', isActive: true, isFragrance: true };
  const orderRepository = {
    findById: jest.fn().mockResolvedValue(order),
    updateItem: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    splitItem: jest.fn().mockResolvedValue(undefined),
  };
  const supplyRepository = { findById: jest.fn().mockResolvedValue(supply) };
  const service = new OrdersService(
    orderRepository as never,
    { execute: jest.fn() } as never,
    supplyRepository as never,
  );
  return { service, order, supply, orderRepository, supplyRepository };
};

it('guarda solo el nombre del aroma y devuelve el pedido actualizado', async () => {
  const { service, order, orderRepository, supplyRepository } = build();
  const updated = { ...order, items: [{ ...order.items[0], fragranceName: 'Lavanda' }] };
  orderRepository.findById.mockResolvedValueOnce(order).mockResolvedValueOnce(updated);

  await expect(service.setItemFragrance(10, 20, { fragranceSupplyId: 3 })).resolves.toEqual(updated);

  expect(supplyRepository.findById).toHaveBeenCalledWith(3);
  expect(orderRepository.updateItem).toHaveBeenCalledTimes(1);
  expect(orderRepository.updateItem).toHaveBeenCalledWith(20, { fragranceName: 'Lavanda' });
  expect(orderRepository.findById.mock.calls).toEqual([[10], [10]]);
});

it('rechaza un pedido inexistente', async () => {
  const { service, orderRepository } = build();
  orderRepository.findById.mockResolvedValue(null);
  const result = service.setItemFragrance(10, 20, { fragranceSupplyId: 3 });

  await expect(result).rejects.toBeInstanceOf(NotFoundException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_NOT_FOUND' } });
  expect(orderRepository.updateItem).not.toHaveBeenCalled();
});

it('rechaza un renglon de otro pedido', async () => {
  const { service, orderRepository, supplyRepository } = build();
  const result = service.setItemFragrance(10, 21, { fragranceSupplyId: 3 });

  await expect(result).rejects.toBeInstanceOf(NotFoundException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_NOT_FOUND' } });
  expect(orderRepository.updateItem).not.toHaveBeenCalled();
  expect(supplyRepository.findById).not.toHaveBeenCalled();
});

it('rechaza un pedido cancelado', async () => {
  const { service, order, orderRepository, supplyRepository } = build();
  order.status = 'CANCELLED';
  const result = service.setItemFragrance(10, 20, { fragranceSupplyId: 3 });

  await expect(result).rejects.toBeInstanceOf(BadRequestException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_NOT_EDITABLE' } });
  expect(orderRepository.updateItem).not.toHaveBeenCalled();
  expect(supplyRepository.findById).not.toHaveBeenCalled();
});

it('rechaza un renglon sin aroma', async () => {
  const { service, order, orderRepository, supplyRepository } = build();
  order.items[0].withFragrance = false;
  const result = service.setItemFragrance(10, 20, { fragranceSupplyId: 3 });

  await expect(result).rejects.toBeInstanceOf(BadRequestException);
  await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_WITHOUT_FRAGRANCE' } });
  expect(orderRepository.updateItem).not.toHaveBeenCalled();
  expect(supplyRepository.findById).not.toHaveBeenCalled();
});

it.each([
  ['inexistente', null],
  ['inactivo', { name: 'Lavanda', isActive: false, isFragrance: true }],
  ['sin marca de aroma', { name: 'Lavanda', isActive: true, isFragrance: false }],
])('rechaza un insumo %s', async (_label, supply) => {
  const { service, orderRepository, supplyRepository } = build();
  supplyRepository.findById.mockResolvedValue(supply);
  const result = service.setItemFragrance(10, 20, { fragranceSupplyId: 3 });

  await expect(result).rejects.toBeInstanceOf(BadRequestException);
  await expect(result).rejects.toMatchObject({
    response: { code: 'INVALID_FRAGRANCE_SUPPLY', data: { fragranceSupplyId: 3 } },
  });
  expect(orderRepository.updateItem).not.toHaveBeenCalled();
});

describe('splitLineAmounts', () => {
  it('reparte importes y la ultima parte absorbe el residuo', () => {
    const item = { unitPrice: '10.00', unitTotalCost: '3.333333', lineTotal: '310.00', lineCost: '103.33' };
    const parts = splitLineAmounts(item, [15, 10, 6]);

    const sum = (key: 'lineTotal' | 'lineCost') => parts.reduce((acc, part) => acc + Math.round(Number(part[key]) * 100), 0) / 100;
    expect(sum('lineTotal').toFixed(2)).toBe('310.00');
    expect(sum('lineCost').toFixed(2)).toBe('103.33');
    expect(parts.map((part) => part.lineTotal)).toEqual(['150.00', '100.00', '60.00']);
    for (const part of parts) {
      expect(Number(part.lineMargin).toFixed(2)).toBe((Number(part.lineTotal) - Number(part.lineCost)).toFixed(2));
    }
  });
});

describe('splitItem', () => {
  it('rechaza si las cantidades no suman la del renglon', async () => {
    const { service, orderRepository } = build();
    const result = service.splitItem(10, 20, { parts: [{ quantity: 15 }, { quantity: 10 }] });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_SPLIT_MISMATCH', data: { expected: 31, received: 25 } } });
    expect(orderRepository.splitItem).not.toHaveBeenCalled();
  });

  it('rechaza un pedido cancelado', async () => {
    const { service, order, orderRepository } = build();
    order.status = 'CANCELLED';
    const result = service.splitItem(10, 20, { parts: [{ quantity: 15 }, { quantity: 16 }] });

    await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_NOT_EDITABLE' } });
    expect(orderRepository.splitItem).not.toHaveBeenCalled();
  });

  it('rechaza aroma en un renglon sin aroma', async () => {
    const { service, order, orderRepository } = build();
    order.items[0].withFragrance = false;
    const result = service.splitItem(10, 20, { parts: [{ quantity: 15, fragranceSupplyId: 3 }, { quantity: 16 }] });

    await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_WITHOUT_FRAGRANCE' } });
    expect(orderRepository.splitItem).not.toHaveBeenCalled();
  });

  it('hereda color, pone el aroma resuelto y copia el renglon a las partes nuevas', async () => {
    const { service, orderRepository } = build();
    await service.splitItem(10, 20, {
      parts: [{ quantity: 15, fragranceSupplyId: 3 }, { quantity: 10, candleColor: 'Azul' }, { quantity: 6, candleColor: ' ' }],
    });

    const [orderId, itemId, first, rest] = orderRepository.splitItem.mock.calls[0];
    expect([orderId, itemId]).toEqual([10, 20]);
    expect(first).toMatchObject({ quantity: 15, candleColor: 'Blanco', fragranceName: 'Lavanda', lineTotal: '150.00' });
    expect(rest).toHaveLength(2);
    expect(rest[0]).toMatchObject({ orderId: 10, sortOrder: 0, quantity: 10, candleColor: 'Azul', fragranceName: null, unitTotalCost: '3.333333' });
    expect(rest[0]).not.toHaveProperty('id');
    expect(rest[1]).toMatchObject({ quantity: 6, candleColor: null });
  });
});

describe('update', () => {
  it('guarda notas en blanco como null', async () => {
    const { service, orderRepository } = build();
    await service.update(10, { notes: '  ' });
    expect(orderRepository.update).toHaveBeenCalledWith(10, { notes: null });
  });

  it('rechaza un pedido cancelado', async () => {
    const { service, order, orderRepository } = build();
    order.status = 'CANCELLED';
    await expect(service.update(10, { notes: 'x' })).rejects.toMatchObject({ response: { code: 'ORDER_NOT_EDITABLE' } });
    expect(orderRepository.update).not.toHaveBeenCalled();
  });
});

describe('updateItem', () => {
  it('rechaza aroma en un renglon sin aroma', async () => {
    const { service, order, orderRepository } = build();
    order.items[0].withFragrance = false;
    const result = service.updateItem(10, 20, { fragranceSupplyId: 3 });

    await expect(result).rejects.toMatchObject({ response: { code: 'ORDER_ITEM_WITHOUT_FRAGRANCE' } });
    expect(orderRepository.updateItem).not.toHaveBeenCalled();
  });

  it('guarda textos vacios como null y el aroma por nombre', async () => {
    const { service, orderRepository } = build();
    await service.updateItem(10, 20, { candleColor: '', personalizationText: 'Ana y Luis', fragranceSupplyId: 3 });
    expect(orderRepository.updateItem).toHaveBeenCalledWith(20, { candleColor: null, personalizationText: 'Ana y Luis', fragranceName: 'Lavanda' });
  });
});
