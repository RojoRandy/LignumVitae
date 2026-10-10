import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as sharp from 'sharp';
import { SettingsService } from '../settings/settings.service';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';
import type { CatalogProduct } from '../catalog/products/product.repository';
import { PdfService, absoluteAssetUrl, mobileRenderPlan } from './pdf.service';

it('una ruta local /static se resuelve contra el propio API', () => {
  expect(absoluteAssetUrl('/static/a.jpg', 3100)).toBe('http://127.0.0.1:3100/static/a.jpg');
});

it('una URL de S3 se deja tal cual', () => {
  expect(absoluteAssetUrl('https://bucket.s3.amazonaws.com/a.jpg', 3100)).toBe('https://bucket.s3.amazonaws.com/a.jpg');
});

describe('mobileRenderPlan', () => {
  it.each<[number, number, boolean, number, boolean]>([
    [600, 602, false, 2, false],
    [9000, 9002, false, 1.77, false],
    [15000, 14000, true, 1.06, false],
    [16500, 14000, true, 0.96, true],
    [0, 2, false, 2, false],
  ])('calcula el plan para un alto de %i', (height, pdfPageHeight, paginate, imageScale, imageTooTall) => {
    expect(mobileRenderPlan(height)).toEqual({ pdfPageHeight, paginate, imageScale, imageTooTall });
  });
});

describe('catalogo', () => {
  const build = () => {
    const settingsService = {
      get: jest.fn().mockResolvedValue({
        brandName: 'Lignum Vitae', phone: '618 396 9515', whatsapp: '', email: '',
        bankName: '', bankAccountHolder: '', bankClabe: '', bankCardNumber: '',
        wholesaleThresholdQty: 31, fragranceSurcharge: new Prisma.Decimal(1),
      }),
    } as unknown as SettingsService;
    const configService = { get: jest.fn().mockReturnValue('') } as unknown as ConfigService;
    const money = (n: number) => new Prisma.Decimal(n);
    const ositos = { id: 1, name: 'Ositos', description: null, sortOrder: 0 };
    const product: CatalogProduct = {
      id: 1, name: 'Osito', description: null, kind: 'SIMPLE', images: [],
      retailListPrice: money(20), wholesaleListPrice: money(15),
      retailPriceOverride: null, wholesalePriceOverride: null,
      candle: { id: 1, name: 'Molde', heightCm: money(4.5), widthCm: money(2.5), grams: money(15) },
      category: ositos,
    };
    const products: CatalogProduct[] = [
      product,
      { ...product, id: 2, name: 'Ramo', kind: 'BOUQUET', candle: null, retailListPrice: money(0) },
      { ...product, id: 3, name: 'Osito grande' },
      { ...product, id: 4, name: 'Estrella', candle: { ...product.candle!, id: 2, name: 'Estrellas' } },
      { ...product, id: 5, name: 'Flor', candle: { ...product.candle!, id: 3, name: 'Flores' },
        category: { id: 2, name: 'Flores', description: 'Florales', sortOrder: 1 } },
    ];
    return { service: new PdfService(settingsService, configService), products };
  };

  it('agrupa categorias y moldes en orden, dejando Otros modelos al final', () => {
    const { service, products } = build();
    const categories = service.groupCatalog(products);
    expect(categories.map((category) => category.name)).toEqual(['Ositos', 'Flores']);
    expect(categories.map((category) => category.description)).toEqual([null, 'Florales']);
    expect(categories[0].molds.map((mold) => mold.name)).toEqual(['Molde', 'Estrellas', 'Otros modelos']);
    expect(categories[1].molds.map((mold) => mold.name)).toEqual(['Flores']);
    expect(categories.flatMap((category) => category.molds.map((mold) => mold.products.map((product) => product.number))))
      .toEqual([[1, 2], [1], [1], [1]]);
    expect(categories[0].molds[0].products.map((product) => product.name)).toEqual(['Osito', 'Osito grande']);
    expect(categories[0].molds[0].dims).toBe('4.5 cm de alto · 2.5 cm de ancho · 15 gramos');
    expect(categories[0].molds[2].dims).toBeNull();
    expect(categories[0].molds[2].products[0].retail).toBeNull();
    expect(categories[0].molds[0].products[0]).toMatchObject({ retail: 20, wholesale: 15, imageUrl: null });
    for (const category of categories) {
      expect(category.coverImages).toEqual([]);
      for (const mold of category.molds) {
        for (const product of mold.products) expect(product).not.toHaveProperty('dims');
      }
    }
  });

  it('omite medidas no positivas y devuelve null cuando no hay medidas', () => {
    const { service, products } = build();
    const product = products[0];
    product.candle = { ...product.candle!, heightCm: new Prisma.Decimal(0), widthCm: new Prisma.Decimal(-1) };
    expect(service.groupCatalog([product])[0].molds[0].dims).toBe('15 gramos');
    product.candle.grams = new Prisma.Decimal(0);
    expect(service.groupCatalog([product])[0].molds[0].dims).toBeNull();
  });

  it('limita la portada a seis imagenes y prioriza moldes distintos', () => {
    const { service, products } = build();
    const images = Array.from({ length: 8 }, (_, i) => ({
      ...products[i < 4 ? 0 : 3], id: i + 1, name: `Producto ${i + 1}`,
      images: [{ url: `https://example.com/${i + 1}.jpg` }],
    }));
    const [category] = service.groupCatalog(images);
    expect(category.coverImages).toEqual([
      { src: 'https://example.com/1.jpg', label: 'Molde' },
      { src: 'https://example.com/5.jpg', label: 'Estrellas' },
      ...[2, 3, 4, 6].map((i) => ({ src: `https://example.com/${i}.jpg`, label: `Producto ${i}` })),
    ]);
  });

  it('elige el primer producto con imagen y usa thumbnail o URL absoluta', () => {
    const { service, products } = build();
    products[2].images = [{ url: '/static/osito.jpg' }];
    products[1].images = [{ url: '/static/ramo.jpg' }];
    const [category] = service.groupCatalog(products, new Map([[3, 'data:image/jpeg;base64,AAA']]));
    expect(category.molds[0].products[1].imageUrl).toBe('data:image/jpeg;base64,AAA');
    expect(category.coverImages).toEqual([
      { src: 'data:image/jpeg;base64,AAA', label: 'Molde' },
      { src: absoluteAssetUrl('/static/ramo.jpg'), label: 'Otros modelos' },
    ]);
  });

  it('buildCatalogHtml delega el agrupado sin depender de la plantilla', async () => {
    const { service, products } = build();
    const group = jest.spyOn(service, 'groupCatalog');
    const thumbnails = new Map<number, string>();
    await service.buildCatalogHtml(products, thumbnails);
    expect(group).toHaveBeenCalledWith(products, thumbnails);
  });

  it.each(['renderCatalogPdf', 'renderCatalogImages'] as const)('%s rechaza un catalogo sin productos', async (method) => {
    const { service } = build();
    await expect(service[method]([])).rejects.toThrow(BadRequestException);
  });

  describe('thumbnail', () => {
    const originalFetch = global.fetch;
    afterEach(() => { global.fetch = originalFetch; });

    it('convierte un PNG de 800×600 en JPEG de 360×360', async () => {
      const { service } = build();
      const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: 'white' } }).png().toBuffer();
      global.fetch = jest.fn().mockResolvedValue({
        ok: true, headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => Uint8Array.from(png).buffer,
      });
      const result = await service.thumbnail('https://example.com/image.png');
      expect(result).toMatch(/^data:image\/jpeg;base64,/);
      const metadata = await sharp(Buffer.from(result!.split(',')[1], 'base64')).metadata();
      expect(metadata).toMatchObject({ format: 'jpeg', width: 360, height: 360 });
    });

    it('devuelve null si fetch no es ok', async () => {
      const { service } = build();
      global.fetch = jest.fn().mockResolvedValue({ ok: false });
      await expect(service.thumbnail('https://example.com/missing.png')).resolves.toBeNull();
    });

    it('devuelve null si fetch falla', async () => {
      const { service } = build();
      global.fetch = jest.fn().mockRejectedValue(new Error('Sin red'));
      await expect(service.thumbnail('https://example.com/image.png')).resolves.toBeNull();
    });
  });
});

describe('buildHtml', () => {
  const build = () => {
    const settingsService = {
      get: jest.fn().mockResolvedValue({
        brandName: 'Lignum Vitae', phone: '', whatsapp: '', email: '',
        bankName: '', bankAccountHolder: '', bankClabe: '', bankCardNumber: '',
      }),
    } as unknown as SettingsService;
    const configService = { get: jest.fn().mockReturnValue('') } as unknown as ConfigService;
    const money = (n: number) => new Prisma.Decimal(n);
    const quotation = {
      folio: 'C-1', customer: { fullName: 'Cliente' }, publicToken: 'token',
      subtotal: money(17), discountAmount: money(0), shippingCost: money(0), total: money(17), depositAmount: money(7),
      items: [{ product: { name: 'Vela', images: [] }, quantity: 1, unitPrice: money(17), lineTotal: money(17), withFragrance: true, fragranceSupply: null }],
    } as unknown as QuotationWithRelations;
    return { service: new PdfService(settingsService, configService), quotation };
  };

  it('movil: lleva layout-mobile y agrupa cantidad/precio/importe en una celda', async () => {
    const { service, quotation } = build();
    const html = await service.buildHtml(quotation, 'mobile');
    expect(html).toContain('<body class="layout-mobile">');
    expect(html).toContain('class="nums"');
    expect(html).toContain('Aroma: Pendiente');
  });

  it('carta: lleva layout-letter y conserva tres celdas num sueltas', async () => {
    const { service, quotation } = build();
    const html = await service.buildHtml(quotation, 'letter');
    expect(html).toContain('<body class="layout-letter">');
    expect(html).not.toContain('class="nums"');
    expect(html.match(/<td class="num"/g)).toHaveLength(3);
  });
});
