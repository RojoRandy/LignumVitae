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
import { SettingsService } from '../settings/settings.service';
import { registerHelpers } from './templates/helpers';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';

@Injectable()
export class PdfService {
  private readonly quotationTemplate: HandlebarsTemplateDelegate;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {
    registerHelpers();
    const source = readFileSync(join(__dirname, 'templates', 'quotation.hbs'), 'utf-8');
    this.quotationTemplate = Handlebars.compile(source);
  }

  async renderQuotationPdf(quotation: QuotationWithRelations): Promise<Buffer> {
    const settings = await this.settingsService.get();
    const publicSiteUrl = this.configService.get<string>('PUBLIC_SITE_URL') ?? '';

    const html = this.quotationTemplate({
      brandName: settings.brandName,
      logoUrl: settings.logoUrl,
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      folio: quotation.folio,
      issuedAt: quotation.issuedAt,
      validUntil: quotation.validUntil,
      eventDate: quotation.eventDate,
      customer: quotation.customer,
      items: quotation.items,
      subtotal: quotation.subtotal.toNumber(),
      discountEnabled: quotation.discountEnabled,
      discountAmount: quotation.discountAmount.toNumber(),
      shippingCost: quotation.shippingCost.toNumber(),
      total: quotation.total.toNumber(),
      depositAmount: quotation.depositAmount.toNumber(),
      terms: quotation.terms || settings.quotationFooterNote || null,
      notes: quotation.notes,
      publicUrl: `${publicSiteUrl}/cotizacion/${quotation.publicToken}`,
    });

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      // setContent no dispara peticiones de red externas (todo va inline en
      // el .hbs), asi que 'load' es suficiente -- networkidle0/2 solo aplica
      // a page.goto().
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
