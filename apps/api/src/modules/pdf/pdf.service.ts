// Genera PDFs con Puppeteer + Handlebars. La plantilla se compila UNA vez
// (se cachea en el campo de clase), no en cada render -- el negocio no
// genera volumen suficiente para justificar un navegador Puppeteer
// persistente (singleton), asi que se lanza y se cierra por peticion.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import * as sharp from 'sharp';
import { zipSync, type Zippable } from 'fflate';
import puppeteer, { type Page, type Viewport } from 'puppeteer';
import { SettingsService, toBankAccount } from '../settings/settings.service';
import { registerHelpers } from './templates/helpers';
import type { QuotationWithRelations } from '../sales/quotations/quotation.repository';
import type { CatalogProduct } from '../catalog/products/product.repository';
import { candleDimensions, toPublicPrices } from '../public/dto/public-catalog.dto';

export type QuotationLayout = 'letter' | 'mobile';

export const MAX_PDF_PAGE_HEIGHT = 14000;
export const MAX_IMAGE_HEIGHT = 16000;

export const mobileRenderPlan = (contentHeight: number) => ({
  pdfPageHeight: Math.min(Math.ceil(contentHeight) + 2, MAX_PDF_PAGE_HEIGHT),
  paginate: contentHeight + 2 > MAX_PDF_PAGE_HEIGHT,
  imageScale: contentHeight <= 0 ? 2 : Math.min(2, Math.floor((MAX_IMAGE_HEIGHT / contentHeight) * 100) / 100),
  imageTooTall: contentHeight > MAX_IMAGE_HEIGHT,
});

/** Puppeteer corre en el mismo host que el API, asi que una ruta relativa
 *  "/static/..." (STORAGE_DRIVER=local) se resuelve contra el propio API; las
 *  URLs de S3 ya vienen absolutas. */
export const absoluteAssetUrl = (url: string, port: string | number = process.env.PORT ?? 3000) =>
  /^https?:\/\//.test(url) ? url : `http://127.0.0.1:${port}${url}`;

@Injectable()
export class PdfService {
  private readonly quotationTemplate: HandlebarsTemplateDelegate;
  private readonly catalogTemplate: HandlebarsTemplateDelegate;
  /** Logo circular de la marca (copia de apps/landing/public/logo.svg),
   *  incrustado como data URI: no depende de red ni de Settings.logoUrl. */
  private readonly logoSrc: string;
  private readonly fontSrc: string;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {
    registerHelpers();
    const source = readFileSync(join(__dirname, 'templates', 'quotation.hbs'), 'utf-8');
    this.quotationTemplate = Handlebars.compile(source);
    this.catalogTemplate = Handlebars.compile(readFileSync(join(__dirname, 'templates', 'catalog.hbs'), 'utf-8'));
    const logo = readFileSync(join(__dirname, 'templates', 'logo-circular.svg'));
    this.logoSrc = `data:image/svg+xml;base64,${logo.toString('base64')}`;
    const font = readFileSync(join(__dirname, 'templates', 'fonts', 'Parisienne-Regular.ttf'));
    this.fontSrc = `data:font/ttf;base64,${font.toString('base64')}`;
  }

  // expuesto para pruebas
  async buildHtml(quotation: QuotationWithRelations, layout: QuotationLayout): Promise<string> {
    const settings = await this.settingsService.get();
    const publicSiteUrl = this.configService.get<string>('PUBLIC_SITE_URL') ?? '';

    return this.quotationTemplate({
      layout,
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

  // expuesto para pruebas
  async buildCatalogHtml(products: CatalogProduct[], thumbnails?: Map<number, string>): Promise<string> {
    const settings = await this.settingsService.get();
    const t = settings.wholesaleThresholdQty;
    return this.catalogTemplate({
      brandName: settings.brandName,
      logoSrc: this.logoSrc,
      fontSrc: this.fontSrc,
      retailLabel: `1 - ${t - 1} Pzs`,
      wholesaleLabel: `+${t} Pzs`,
      fragranceSurcharge: Number(settings.fragranceSurcharge) || null,
      // Mismo numero en telefono y WhatsApp: se muestra una sola vez.
      contact: [settings.phone === settings.whatsapp ? '' : settings.phone, settings.whatsapp ? `WhatsApp ${settings.whatsapp}` : ''].filter(Boolean).join(' / ') || null,
      categories: this.groupCatalog(products, thumbnails),
    });
  }

  // expuesto para pruebas
  groupCatalog(products: CatalogProduct[], thumbnails?: Map<number, string>) {
    const categories = new Map<number, CatalogProduct[]>();
    for (const product of products) {
      const group = categories.get(product.category.id);
      if (group) group.push(product);
      else categories.set(product.category.id, [product]);
    }
    const imageUrl = (product: CatalogProduct) =>
      thumbnails?.get(product.id) ?? (product.images[0] ? absoluteAssetUrl(product.images[0].url) : null);

    return [...categories.values()].map((group) => {
      const moldGroups = new Map<number | null, CatalogProduct[]>();
      for (const product of group) {
        const key = product.candle?.id ?? null;
        const mold = moldGroups.get(key);
        if (mold) mold.push(product);
        else moldGroups.set(key, [product]);
      }
      const other = moldGroups.get(null);
      if (other) {
        moldGroups.delete(null);
        moldGroups.set(null, other);
      }
      const coverImages: { src: string; label: string }[] = [];
      const used = new Set<number>();
      for (const mold of moldGroups.values()) {
        const product = mold.find((product) => imageUrl(product));
        if (product && coverImages.length < 6) {
          coverImages.push({ src: imageUrl(product)!, label: product.candle?.name ?? 'Otros modelos' });
          used.add(product.id);
        }
      }
      for (const product of group) {
        if (coverImages.length >= 6) break;
        const src = imageUrl(product);
        if (src && !used.has(product.id)) {
          coverImages.push({ src, label: product.name });
          used.add(product.id);
        }
      }
      return {
        name: group[0].category.name,
        description: group[0].category.description,
        coverImages,
        molds: [...moldGroups.values()].map((mold) => {
          const candle = mold[0].candle;
          return {
            name: candle?.name ?? 'Otros modelos',
            dims: candleDimensions(candle),
            products: mold.map((product, index) => ({
              number: index + 1,
              name: product.name,
              description: product.description,
              imageUrl: imageUrl(product),
              ...toPublicPrices(product),
            })),
          };
        }),
      };
    });
  }

  // Las URL de imagen llevan UUID (nunca cambian de contenido): se recuerdan para no volver a bajarlas de S3.
  // ponytail: cache en memoria sin expiracion (tope 500 fotos, ~15 MB); Redis si hay varias instancias.
  private readonly thumbnailCache = new Map<string, string>();

  private async buildThumbnails(products: CatalogProduct[]): Promise<Map<number, string>> {
    const thumbnails = new Map<number, string>();
    const withImages = products.filter((product) => product.images[0]);
    // La descarga desde S3 es lo lento (sharp tarda ~30 ms por foto): muchas a la vez.
    for (let i = 0; i < withImages.length; i += 24) {
      await Promise.all(withImages.slice(i, i + 24).map(async (product) => {
        const url = absoluteAssetUrl(product.images[0].url);
        let src = this.thumbnailCache.get(url) ?? null;
        if (src === null) {
          src = await this.thumbnail(url);
          if (src !== null) {
            if (this.thumbnailCache.size >= 500) this.thumbnailCache.delete(this.thumbnailCache.keys().next().value!);
            this.thumbnailCache.set(url, src);
          }
        }
        if (src !== null) thumbnails.set(product.id, src);
      }));
    }
    return thumbnails;
  }

  private async renderCatalog<T>(products: CatalogProduct[], viewport: Viewport, fn: (page: Page) => Promise<T>): Promise<T> {
    if (!products.length) throw new BadRequestException('No hay productos para el catálogo');
    const thumbnails = await this.buildThumbnails(products);
    const html = await this.buildCatalogHtml(products, thumbnails);
    return this.withPage(viewport, async (page) => {
      await page.setContent(html, { waitUntil: 'load' });
      await page.waitForFunction('window.catalogReady === true', { timeout: 30000 });
      return fn(page);
    });
  }

  async renderCatalogPdf(products: CatalogProduct[]): Promise<Buffer> {
    return this.renderCatalog(products, { width: 816, height: 1056 }, async (page) => {
      const pdf = await page.pdf({
        width: '8.5in',
        height: '11in',
        printBackground: true,
        margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
      });
      return Buffer.from(pdf);
    });
  }

  async renderCatalogImages(products: CatalogProduct[]): Promise<Buffer> {
    return this.renderCatalog(products, { width: 816, height: 1056, deviceScaleFactor: 2 }, async (page) => {
      const pages = await page.$$('.page');
      if (!pages.length) throw new Error('El catálogo no contiene hojas (.page) para exportar');
      const width = pages.length > 99 ? 3 : 2;
      const files: Zippable = {};
      for (const [i, el] of pages.entries()) {
        const image = await el.screenshot({ type: 'jpeg', quality: 85 });
        files[`pagina-${String(i + 1).padStart(width, '0')}.jpg`] = [new Uint8Array(image), { level: 0 }];
      }
      return Buffer.from(zipSync(files));
    });
  }

  // expuesto para pruebas
  async thumbnail(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await sharp(Buffer.from(await res.arrayBuffer()))
        .rotate()
        .resize(360, 360, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
      return `data:image/jpeg;base64,${data.toString('base64')}`;
    } catch {
      return null;
    }
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
    const html = await this.buildHtml(quotation, layout);
    const viewport = layout === 'mobile' ? { width: 420, height: 800 } : undefined;
    return this.withPage(viewport, async (page) => {
      // El logo va inline; las fotos de producto si se piden por red, y
      // 'load' espera a que terminen de cargar -- networkidle0/2 solo aplica
      // a page.goto().
      // ponytail: imagenes a resolucion original; redimensionar al subir si el PDF pesa.
      await page.setContent(html, { waitUntil: 'load' });
      if (layout === 'mobile') {
        await page.emulateMediaType('print');
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        const plan = mobileRenderPlan(h);
        const pdf = await page.pdf({
          width: '420px',
          height: `${plan.pdfPageHeight}px`,
          printBackground: true,
          margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
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
    const html = await this.buildHtml(quotation, 'mobile');
    return this.withPage({ width: 420, height: 800, deviceScaleFactor: 1 }, async (page) => {
      await page.setContent(html, { waitUntil: 'load' });
      const h = await page.evaluate(() => document.documentElement.scrollHeight);
      const plan = mobileRenderPlan(h);
      if (plan.imageTooTall) {
        throw new BadRequestException('La cotizacion es demasiado larga para exportarla como imagen; descarga el PDF.');
      }
      await page.setViewport({ width: 420, height: 800, deviceScaleFactor: plan.imageScale });
      const image = await page.screenshot({ type: 'png', fullPage: true });
      return Buffer.from(image);
    });
  }
}
