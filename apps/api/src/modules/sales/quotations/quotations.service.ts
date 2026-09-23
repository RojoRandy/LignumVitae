import { Injectable } from '@nestjs/common';
import { Prisma, QuotationStatus } from '@prisma/client';
import { QuotationRepository } from './quotation.repository';
import { CreateQuotationUseCase } from './usecases/create-quotation.usecase';
import { DuplicateQuotationUseCase } from './usecases/duplicate-quotation.usecase';
import { PaginationQueryDto, buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SalesErrors } from '../../../common/errors/sales.errors';
import { CreateQuotationDto, UpdateQuotationDto } from './dto/create-quotation.dto';
import type { FindQuotationsQueryDto } from './dto/find-quotations.query.dto';

/** Un status "abierto" nunca deja de aceptar mas cambios de status: enviar,
 *  ver, aceptar o rechazar. Cerrado = ya tuvo su desenlace. */
const EDITABLE_STATUSES: QuotationStatus[] = ['DRAFT'];
const ACCEPT_REJECT_STATUSES: QuotationStatus[] = ['SENT', 'VIEWED'];

@Injectable()
export class QuotationsService {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly createQuotationUseCase: CreateQuotationUseCase,
    private readonly duplicateQuotationUseCase: DuplicateQuotationUseCase,
  ) {}

  async findAll(query: FindQuotationsQueryDto) {
    await this.quotationRepository.expireOverdue();
    const { page = 1, limit = 20, status, customerId, onlyActive = true } = query;
    const where: Prisma.QuotationWhereInput = {
      ...(onlyActive ? { isActive: true } : {}),
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    };
    const [items, total] = await Promise.all([
      this.quotationRepository.findMany({ where, orderBy: { issuedAt: 'desc' }, ...paginate(page, limit) }),
      this.quotationRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    await this.quotationRepository.expireOverdue();
    const quotation = await this.quotationRepository.findById(id);
    if (!quotation) throw SalesErrors.Exceptions.QUOTATION_NOT_FOUND({ id });
    return quotation;
  }

  create(dto: CreateQuotationDto, userId?: number) {
    return this.createQuotationUseCase.execute({ dto, userId });
  }

  async update(id: number, dto: UpdateQuotationDto) {
    const existing = await this.findById(id);
    if (!EDITABLE_STATUSES.includes(existing.status)) throw SalesErrors.Exceptions.QUOTATION_NOT_EDITABLE({ id, status: existing.status });
    return this.createQuotationUseCase.execute({ dto: dto as CreateQuotationDto, existingId: id });
  }

  async send(id: number) {
    const existing = await this.findById(id);
    if (!EDITABLE_STATUSES.includes(existing.status)) throw SalesErrors.Exceptions.QUOTATION_NOT_EDITABLE({ id, status: existing.status });
    await this.quotationRepository.update(id, { status: 'SENT', sentAt: new Date() });
    return this.findById(id);
  }

  async reject(id: number) {
    const existing = await this.findById(id);
    if (!['DRAFT', ...ACCEPT_REJECT_STATUSES].includes(existing.status)) {
      throw SalesErrors.Exceptions.QUOTATION_NOT_ACCEPTABLE({ id, status: existing.status });
    }
    await this.quotationRepository.update(id, { status: 'REJECTED', rejectedAt: new Date() });
    return this.findById(id);
  }

  async deactivate(id: number) {
    const quotation = await this.findById(id);
    if (quotation.order) throw SalesErrors.Exceptions.QUOTATION_ALREADY_CONVERTED({ id });
    return this.quotationRepository.setActive(id, false);
  }

  async restore(id: number) {
    await this.findById(id);
    return this.quotationRepository.setActive(id, true);
  }

  async deletePermanently(id: number) {
    const quotation = await this.findById(id);
    if (quotation.isActive) throw SalesErrors.Exceptions.MUST_BE_INACTIVE({ id });
    if (quotation.order) throw SalesErrors.Exceptions.QUOTATION_ALREADY_CONVERTED({ id });
    return this.quotationRepository.deletePermanently(id);
  }

  duplicate(id: number, userId?: number) {
    return this.duplicateQuotationUseCase.execute({ id, userId });
  }

  async findByPublicToken(token: string) {
    await this.quotationRepository.expireOverdue();
    const quotation = await this.quotationRepository.findByPublicToken(token);
    if (!quotation || !quotation.isActive) throw SalesErrors.Exceptions.QUOTATION_NOT_FOUND({ token });
    return quotation;
  }

  /** Idempotente: solo pasa de SENT a VIEWED la primera vez que se abre el
   *  enlace publico. Volver a abrirlo, o abrirlo ya ACCEPTED, no hace nada. */
  async markViewed(id: number, status: QuotationStatus) {
    if (status !== 'SENT') return;
    await this.quotationRepository.update(id, { status: 'VIEWED', viewedAt: new Date() });
  }
}
