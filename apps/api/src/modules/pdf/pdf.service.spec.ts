import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';
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
