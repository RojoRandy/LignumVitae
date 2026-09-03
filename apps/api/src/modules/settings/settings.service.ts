// Fuente unica de la verdad para los datos del negocio. Regla dura: ningun
// otro service relee Settings directo de PrismaService — todos pasan por
// SettingsRepository via este service, y toPublicDto() es la UNICA lista
// blanca de lo que sale por /api/public/*.
import { Injectable } from '@nestjs/common';
import { Settings } from '@prisma/client';
import { laborRatePerMinute } from '@lignumvitae/types';
import { SettingsRepository } from './repositories/settings.repository';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  get(): Promise<Settings> {
    return this.settingsRepository.get();
  }

  update(dto: UpdateSettingsDto): Promise<Settings> {
    return this.settingsRepository.update(dto);
  }

  /** T del Excel: (dailyWage/8)/60, ya con las constantes en Settings. */
  async laborRatePerMinute(): Promise<number> {
    const settings = await this.get();
    return laborRatePerMinute(settings.dailyWage.toNumber(), settings.workHoursPerDay);
  }

  /**
   * Lista blanca de campos publicos. Se omiten a proposito: legalName (RFC
   * implicito), prefijos de folio, y todas las politicas de costeo internas
   * (markups, gastos indirectos, piso de margen).
   */
  async getPublic() {
    const s = await this.get();
    return {
      brandName: s.brandName,
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
