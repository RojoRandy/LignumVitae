import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

const build = () => {
  const order = {
    id: 10,
    status: 'CONFIRMED' as OrderStatus,
    items: [{ id: 20, orderId: 10, withFragrance: true, fragranceName: null as string | null }],
  };
  const supply = { id: 3, name: 'Lavanda', isActive: true, isFragrance: true };
  const orderRepository = {
    findById: jest.fn().mockResolvedValue(order),
    updateItem: jest.fn().mockResolvedValue({}),
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
