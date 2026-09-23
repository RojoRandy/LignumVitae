// Solicitudes crudas del cotizador publico de la landing. No llevan precio ni
// cliente: la duena las convierte en Quotation desde el admin.
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SettingsService } from '../../settings/settings.service';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { SalesErrors } from '../../../common/errors/sales.errors';
import type { CreateQuoteRequestDto } from '../../public/dto/create-quote-request.dto';
import { QuoteRequestRepository } from './quote-request.repository';
import type { FindQuoteRequestsQueryDto } from './dto/find-quote-requests.query.dto';

type QuotableSupply = { supply: { id: number; quoteFieldLabel: string | null } };

// Frontera de confianza: la landing manda supplyId + valor, pero solo cuentan
// los insumos marcados "Indicar en cotizacion" que de verdad estan en el BOM
// del producto; el label sale de la BD, nunca del cliente. Lo demas se descarta.
export const cleanExtraFields = (input: { supplyId: number; value: string }[] | undefined, supplies: QuotableSupply[]) => {
  const allowed = new Map(supplies.filter((s) => s.supply.quoteFieldLabel).map((s) => [s.supply.id, s.supply.quoteFieldLabel!]));
  const seen = new Set<number>();
  const clean: { supplyId: number; label: string; value: string }[] = [];
  for (const field of input ?? []) {
    const value = field.value.trim();
    const label = allowed.get(field.supplyId);
    if (!value || !label || seen.has(field.supplyId)) continue;
    seen.add(field.supplyId);
    clean.push({ supplyId: field.supplyId, label, value });
  }
  return clean;
};

@Injectable()
export class QuoteRequestsService {
  constructor(
    private readonly quoteRequestRepository: QuoteRequestRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(query: FindQuoteRequestsQueryDto) {
    const { page = 1, limit = 20, status, onlyActive = true } = query;
    const where: Prisma.QuoteRequestWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(status ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      this.quoteRequestRepository.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(page, limit) }),
      this.quoteRequestRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const request = await this.quoteRequestRepository.findById(id);
    if (!request) throw SalesErrors.Exceptions.QUOTE_REQUEST_NOT_FOUND({ id });
    return request;
  }

  async dismiss(id: number, reason?: string) {
    const request = await this.findById(id);
    const changed = await this.quoteRequestRepository.markFromNew(id, { status: 'DISMISSED', dismissedReason: reason?.trim() || null });
    if (!changed) throw SalesErrors.Exceptions.QUOTE_REQUEST_NOT_NEW({ id, status: request.status });
    return this.findById(id);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.quoteRequestRepository.setActive(id, false);
  }

  async restore(id: number) {
    await this.findById(id);
    return this.quoteRequestRepository.setActive(id, true);
  }

  async deletePermanently(id: number) {
    const request = await this.findById(id);
    if (request.isActive) throw SalesErrors.Exceptions.MUST_BE_INACTIVE({ id });
    return this.quoteRequestRepository.delete(id);
  }

  async createFromWeb(dto: CreateQuoteRequestDto) {
    const settings = await this.settingsService.get();

    // Se compara la fecha de calendario en la zona del negocio, no timestamps:
    // la landing ofrece hoy+N como minimo y ese dia tiene que pasar a
    // cualquier hora.
    // (common/utils/date.ts no sirve aqui: su import de dayjs truena al cargar.)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: settings.timezone }).format(new Date());
    const min = new Date(`${today}T00:00:00Z`);
    min.setUTCDate(min.getUTCDate() + settings.minLeadTimeDays);
    const minEventDate = min.toISOString().slice(0, 10);
    if (dto.eventDate.slice(0, 10) < minEventDate) {
      throw SalesErrors.Exceptions.LEAD_TIME_TOO_SHORT({
        eventDate: dto.eventDate,
        minEventDate,
        minLeadTimeDays: settings.minLeadTimeDays,
      });
    }

    const ids = [...new Set(dto.items.map((item) => item.productId))];
    const products = new Map((await this.quoteRequestRepository.findQuotableProducts(ids)).map((p) => [p.id, p]));
    const missing = ids.filter((id) => !products.has(id));
    // 400 y no 404: el recurso es la solicitud, lo que esta mal es su contenido.
    if (missing.length) throw new BadRequestException(CatalogErrors.Responses.PRODUCT_NOT_FOUND({ productIds: missing }));

    // Mismo criterio que la cotizacion del admin (create-quotation.usecase.ts):
    // el aroma debe existir, estar activo y seguir marcado como aroma.
    const fragranceIds = [...new Set(dto.items.map((item) => item.fragranceSupplyId).filter((id): id is number => id != null))];
    const fragrances = new Map(
      (fragranceIds.length ? await this.quoteRequestRepository.findQuotableFragrances(fragranceIds) : []).map((f) => [f.id, f]),
    );
    const missingFragrances = fragranceIds.filter((id) => !fragrances.has(id));
    if (missingFragrances.length) throw SalesErrors.Exceptions.INVALID_FRAGRANCE_SUPPLY({ fragranceSupplyIds: missingFragrances });

    const items = dto.items.map((item) => {
      const product = products.get(item.productId)!;
      const withFragrance = product.allowsFragrance && Boolean(item.withFragrance);
      const fragrance = withFragrance && item.fragranceSupplyId != null ? fragrances.get(item.fragranceSupplyId) : undefined;
      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        candleColor: item.candleColor?.trim() || null,
        extraFields: cleanExtraFields(item.extraFields, product.supplies),
        withFragrance,
        fragranceSupplyId: fragrance?.id ?? null,
        fragranceName: fragrance?.name ?? null,
      };
    });

    return this.quoteRequestRepository.create({
      fullName: dto.fullName.trim(),
      whatsapp: dto.whatsapp,
      eventDate: new Date(`${dto.eventDate.slice(0, 10)}T00:00:00Z`),
      notes: dto.notes?.trim() || null,
      items: items as Prisma.InputJsonValue,
    });
  }
}
