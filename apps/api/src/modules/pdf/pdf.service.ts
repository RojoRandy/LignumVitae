// Genera PDFs con Puppeteer + Handlebars. La plantilla se compila UNA vez
// (se cachea en el campo de clase), no en cada render -- el negocio no
// genera volumen suficiente para justificar un navegador Puppeteer
// persistente (singleton), asi que se lanza y se cierra por peticion.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import { SettingsService, toBankAccount } from '../settings/settings.service';
import { registerHelpers } from './templates/helpers';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';

/** Puppeteer corre en el mismo host que el API, asi que una ruta relativa
 *  "/static/..." (STORAGE_DRIVER=local) se resuelve contra el propio API; las
 *  URLs de S3 ya vienen absolutas. */
export const absoluteAssetUrl = (url: string, port: string | number = process.env.PORT ?? 3000) =>
  /^https?:\/\//.test(url) ? url : `http://127.0.0.1:${port}${url}`;

@Injectable()
export class PdfService {
  private readonly quotationTemplate: HandlebarsTemplateDelegate;
  /** Logo circular de la marca (copia de apps/landing/public/logo.svg),
   *  incrustado como data URI: no depende de red ni de Settings.logoUrl. */
  private readonly logoSrc: string;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {
    registerHelpers();
    const source = readFileSync(join(__dirname, 'templates', 'quotation.hbs'), 'utf-8');
    this.quotationTemplate = Handlebars.compile(source);
    const logo = readFileSync(join(__dirname, 'templates', 'logo-circular.svg'));
    this.logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`;
  }

  async renderQuotationPdf(quotation: QuotationWithRelations): Promise<Buffer> {
    const settings = await this.settingsService.get();
    const publicSiteUrl = this.configService.get<string>('PUBLIC_SITE_URL') ?? '';

    const html = this.quotationTemplate({
      brandName: settings.brandName,
      logoSrc: this.logoSrc,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      folio: quotation.folio,
      issuedAt: quotation.issuedAt,
      validUntil: quotation.validUntil,
      eventDate: quotation.eventDate,
      customer: quotation.customer,
      items: quotation.items.map((item) => {
        const image = item.product.images[0];
        return { ...item, imageUrl: image ? absoluteAssetUrl(image.url) : null };
      }),
      subtotal: quotation.subtotal.toNumber(),
      discountEnabled: quotation.discountEnabled,
      discountAmount: quotation.discountAmount.toNumber(),
      shippingCost: quotation.shippingCost.toNumber(),
      total: quotation.total.toNumber(),
      depositAmount: quotation.depositAmount.toNumber(),
      terms: quotation.terms || settings.quotationFooterNote || null,
      notes: quotation.notes,
      bankAccount: toBankAccount(settings),
      publicUrl: `${publicSiteUrl}/cotizacion/${quotation.publicToken}`,
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      // El logo va inline; las fotos de producto si se piden por red, y
      // 'load' espera a que terminen de cargar -- networkidle0/2 solo aplica
      // a page.goto().
      // ponytail: imagenes a resolucion original; redimensionar al subir si el PDF pesa.
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
