// Genera PDFs con Puppeteer + Handlebars. La plantilla se compila UNA vez
// (se cachea en el campo de clase), no en cada render -- el negocio no
// genera volumen suficiente para justificar un navegador Puppeteer
// persistente (singleton), asi que se lanza y se cierra por peticion.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import puppeteer, { type Page, type Viewport } from 'puppeteer';
import { SettingsService, toBankAccount } from '../settings/settings.service';
import { registerHelpers } from './templates/helpers';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';

export type QuotationLayout = 'letter' | 'mobile';

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

  private async buildHtml(quotation: QuotationWithRelations): Promise<string> {
    const settings = await this.settingsService.get();
    const publicSiteUrl = this.configService.get<string>('PUBLIC_SITE_URL') ?? '';

    return this.quotationTemplate({
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
  }

  private async withPage<T>(viewport: Viewport | undefined, fn: (page: Page) => Promise<T>): Promise<T> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      if (viewport) await page.setViewport(viewport);
      return await fn(page);
    } finally {
      await browser.close();
    }
  }

  async renderQuotationPdf(quotation: QuotationWithRelations, layout: QuotationLayout = 'letter'): Promise<Buffer> {
    const html = await this.buildHtml(quotation);
    const viewport = layout === 'mobile' ? { width: 420, height: 800 } : undefined;
    return this.withPage(viewport, async (page) => {
      // El logo va inline; las fotos de producto si se piden por red, y
      // 'load' espera a que terminen de cargar -- networkidle0/2 solo aplica
      // a page.goto().
      // ponytail: imagenes a resolucion original; redimensionar al subir si el PDF pesa.
      await page.setContent(html, { waitUntil: 'load' });
      if (layout === 'mobile') {
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        const pdf = await page.pdf({
          width: '420px',
          height: `${h}px`,
          printBackground: true,
          margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
          pageRanges: '1',
        });
        return Buffer.from(pdf);
      }
      const pdf = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
      });
      return Buffer.from(pdf);
    });
  }

  async renderQuotationImage(quotation: QuotationWithRelations): Promise<Buffer> {
    const html = await this.buildHtml(quotation);
    return this.withPage({ width: 420, height: 800, deviceScaleFactor: 2 }, async (page) => {
      await page.setContent(html, { waitUntil: 'load' });
      const image = await page.screenshot({ type: 'png', fullPage: true });
      return Buffer.from(image);
    });
  }
}
