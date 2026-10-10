import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';
import { ProductsController } from './products.controller';

it('recalculateAll llama al caso de uso exactamente una vez', async () => {
  const useCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const controller = new ProductsController({} as never, {} as never, useCase as never, {} as never, {} as never);

  await controller.recalculateAll();

  expect(useCase.execute).toHaveBeenCalledTimes(1);
});

it.each([undefined, { mimetype: 'image/gif' }, { mimetype: 'text/plain' }])(
  'rechaza archivos ausentes o de tipo invalido antes de llamar al service: %j',
  (file) => {
    const service = { addImage: jest.fn() };
    const controller = new ProductsController(service as never, {} as never, {} as never, {} as never, {} as never);
    expect(() => controller.addImage(1, file as Express.Multer.File)).toThrow(
      expect.objectContaining({ status: 400, response: expect.objectContaining({ code: 'INVALID_IMAGE_TYPE' }) }),
    );
    expect(service.addImage).not.toHaveBeenCalled();
  },
);

it.each(['image/jpeg', 'image/png', 'image/webp'])('acepta %s y convierte isPrimary', (mimetype) => {
  const service = { addImage: jest.fn() };
  const controller = new ProductsController(service as never, {} as never, {} as never, {} as never, {} as never);
  const file = { mimetype, buffer: Buffer.from('image') } as Express.Multer.File;
  controller.addImage(1, file, 'true');
  expect(service.addImage).toHaveBeenLastCalledWith(1, file, true);
  controller.addImage(1, file, 'false');
  expect(service.addImage).toHaveBeenLastCalledWith(1, file, false);
});

it('catalogPdf rechaza ids invalidos', async () => {
  const repository = { findForCatalog: jest.fn() };
  const pdfService = { renderCatalogPdf: jest.fn(), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await expect(controller.catalogPdf(res as unknown as Response, 'abc')).rejects.toThrow(BadRequestException);
});

it('catalogPdf elimina ids duplicados', async () => {
  const repository = { findForCatalog: jest.fn().mockResolvedValue([]) };
  const pdfService = { renderCatalogPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await controller.catalogPdf(res as unknown as Response, '3,3,5');

  expect(repository.findForCatalog).toHaveBeenCalledWith({ ids: [3, 5] });
});

it('catalogImages rechaza ids invalidos', async () => {
  const repository = { findForCatalog: jest.fn() };
  const pdfService = { renderCatalogPdf: jest.fn(), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await expect(controller.catalogImages(res as unknown as Response, 'abc')).rejects.toThrow(BadRequestException);
});

it('catalogImages elimina ids duplicados y envia el ZIP', async () => {
  const products = [{ id: 3 }, { id: 5 }];
  const buffer = Buffer.from('zip');
  const repository = { findForCatalog: jest.fn().mockResolvedValue(products) };
  const pdfService = { renderCatalogPdf: jest.fn(), renderCatalogImages: jest.fn().mockResolvedValue(buffer) };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await controller.catalogImages(res as unknown as Response, '3,3,5');

  expect(repository.findForCatalog).toHaveBeenCalledWith({ ids: [3, 5] });
  expect(pdfService.renderCatalogImages).toHaveBeenCalledWith(products);
  expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
  expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="catalogo-lignum-vitae.zip"');
  expect(res.send).toHaveBeenCalledWith(buffer);
});

it('catalogPdf elimina candleIds duplicados', async () => {
  const repository = { findForCatalog: jest.fn().mockResolvedValue([]) };
  const pdfService = { renderCatalogPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await controller.catalogPdf(res as unknown as Response, undefined, '4,4,9');

  expect(repository.findForCatalog).toHaveBeenCalledWith({ candleIds: [4, 9] });
});

it('catalogPdf rechaza ids y candleIds juntos', async () => {
  const repository = { findForCatalog: jest.fn() };
  const pdfService = { renderCatalogPdf: jest.fn(), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await expect(controller.catalogPdf(res as unknown as Response, '3', '4')).rejects.toThrow(
    new BadRequestException('Usa ids o candleIds, no ambos'),
  );
});

it('catalogPdf rechaza candleIds invalidos', async () => {
  const repository = { findForCatalog: jest.fn() };
  const pdfService = { renderCatalogPdf: jest.fn(), renderCatalogImages: jest.fn() };
  const controller = new ProductsController({} as never, {} as never, {} as never, repository as never, pdfService as never);
  const res = { setHeader: jest.fn(), send: jest.fn() };

  await expect(controller.catalogPdf(res as unknown as Response, undefined, 'x')).rejects.toThrow(
    new BadRequestException('candleIds invalidos'),
  );
});
