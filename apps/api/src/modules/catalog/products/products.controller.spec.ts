import { ProductsController } from './products.controller';

it('recalculateAll llama al caso de uso exactamente una vez', async () => {
  const useCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const controller = new ProductsController({} as never, {} as never, useCase as never);

  await controller.recalculateAll();

  expect(useCase.execute).toHaveBeenCalledTimes(1);
});

it.each([undefined, { mimetype: 'image/gif' }, { mimetype: 'text/plain' }])(
  'rechaza archivos ausentes o de tipo invalido antes de llamar al service: %j',
  (file) => {
    const service = { addImage: jest.fn() };
    const controller = new ProductsController(service as never, {} as never, {} as never);
    expect(() => controller.addImage(1, file as Express.Multer.File)).toThrow(
      expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'INVALID_IMAGE_TYPE' }) }),
    );
    expect(service.addImage).not.toHaveBeenCalled();
  },
);

it.each(['image/jpeg', 'image/png', 'image/webp'])('acepta %s y convierte isPrimary', (mimetype) => {
  const service = { addImage: jest.fn() };
  const controller = new ProductsController(service as never, {} as never, {} as never);
  const file = { mimetype, buffer: Buffer.from('image') } as Express.Multer.File;
  controller.addImage(1, file, 'true');
  expect(service.addImage).toHaveBeenLastCalledWith(1, file, true);
  controller.addImage(1, file, 'false');
  expect(service.addImage).toHaveBeenLastCalledWith(1, file, false);
});
