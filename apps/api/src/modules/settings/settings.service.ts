// Fuente unica de la verdad para los datos del negocio. Regla dura: ningun
// otro service relee Settings directo de PrismaService — todos pasan por
// SettingsRepository via este service, y toPublicDto() es la UNICA lista
// blanca de lo que sale por /api/public/*.
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Settings } from '@prisma/client';
import { laborRatePerMinute } from '@lignumvitae/types';
import { SettingsRepository } from './repositories/settings.repository';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// minMarginPct entra porque ahora tambien sube el precio sugerido al piso de margen.
// Fuera a proposito: defaultWastePct
// solo es el default de alta (cada vela trae su merma); fragranceLoadPct y
// fragranceSurcharge se cobran por renglon de cotizacion, nunca en catalogo
// (ambos call sites de catalogo pasan fragrance: null).
const COSTING_KEYS = [
  'dailyWage',
  'workHoursPerDay',
  'meltBatchGrams',
  'wholesaleThresholdQty',
  'overheadRateMode',
  'overheadRatePerMinute',
  'waxSupplyId',
  'retailMarkupPct',
  'wholesaleMarkupPct',
  'minMarginPct',
  'roundingMultiple',
] as const;

@Injectable()
export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly moduleRef: ModuleRef,
  ) {}

  get(): Promise<Settings> {
    return this.settingsRepository.get();
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    const before = await this.get();
    const after = await this.settingsRepository.update(dto);
    if (COSTING_KEYS.some((k) => String(before[k]) !== String(after[k]))) {
      // Import diferido a proposito, NO al tope del archivo: recalculate-all-products.usecase.ts
      // requiere (via recalculate-product-costing.usecase.ts) a SettingsService de vuelta, asi que
      // un import estatico aqui crea un ciclo de require de CommonJS -- SettingsService le llega
      // undefined a RecalculateProductCostingUseCase al construirse, y el build no lo detecta:
      // revienta al arrancar. Ademas SettingsModule lo importan otros nueve modulos contando con
      // que es una hoja sin imports, asi que tampoco conviene resolverlo por ahi (ver settings.module.ts).
      // Postergar el import hasta este punto, ya con todo el modulo cargado, evita las dos cosas.
      // ponytail: recalculo secuencial dentro del PATCH; mover a cola si el catalogo crece a cientos de productos.
      const { RecalculateAllProductsUseCase } = await import('../catalog/products/usecases/recalculate-all-products.usecase');
      const recalculateAllProducts = this.moduleRef.get(RecalculateAllProductsUseCase, { strict: false });
      await recalculateAllProducts.execute();
    }
    return after;
  }

  /** T del Excel: (dailyWage/8)/60, ya con las constantes en Settings. */
  async laborRatePerMinute(): Promise<number> {
    const settings = await this.get();
    return laborRatePerMinute(settings.dailyWage.toNumber(), settings.workHoursPerDay);
  }

  /**
   * Lista blanca de campos publicos. Se omiten a proposito: prefijos de
   * folio, y todas las politicas de costeo internas
   * (markups, gastos indirectos, piso de margen).
   */
  async getPublic() {
    const s = await this.get();
    return {
      brandName: s.brandName,
      legalName: s.legalName,
      logoUrl: s.logoUrl,
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
      city: s.city,
      state: s.state,
      businessHours: s.businessHours,
      instagramUrl: s.instagramUrl,
      facebookUrl: s.facebookUrl,
      tiktokUrl: s.tiktokUrl,
      minLeadTimeDays: s.minLeadTimeDays,
      depositPct: s.depositPct.toNumber(),
      quotationTerms: s.quotationTerms,
      orderPolicyText: s.orderPolicyText,
    };
  }
}
