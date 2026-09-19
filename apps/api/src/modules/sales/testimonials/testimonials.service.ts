import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPaginatedResult, paginate } from '../../../common/dto/pagination.dto';
import { SalesErrors } from '../../../common/errors/sales.errors';
import { StorageService } from '../../catalog/storage/storage.service';
import { TestimonialRepository } from './testimonial.repository';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/create-testimonial.dto';
import type { FindTestimonialsQueryDto } from './dto/find-testimonials.query.dto';

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly testimonialRepository: TestimonialRepository,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: FindTestimonialsQueryDto) {
    const { page = 1, limit = 20, onlyActive = true } = query;
    const where: Prisma.TestimonialWhereInput = onlyActive ? { isActive: true } : {};
    const [items, total] = await Promise.all([
      this.testimonialRepository.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }], ...paginate(page, limit) }),
      this.testimonialRepository.count(where),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async findById(id: number) {
    const testimonial = await this.testimonialRepository.findById(id);
    if (!testimonial) throw SalesErrors.Exceptions.TESTIMONIAL_NOT_FOUND({ id });
    return testimonial;
  }

  async create(dto: CreateTestimonialDto, file: Pick<Express.Multer.File, 'buffer' | 'mimetype'>) {
    const imageUrl = await this.storageService.save(file.buffer, file.mimetype);
    return this.testimonialRepository.create({
      customerName: dto.customerName,
      alt: dto.alt,
      sortOrder: dto.sortOrder ?? 0,
      imageUrl,
      order: dto.orderId ? { connect: { id: dto.orderId } } : undefined,
    });
  }

  async update(id: number, dto: UpdateTestimonialDto) {
    await this.findById(id);
    return this.testimonialRepository.update(id, dto);
  }

  // El archivo se borra en storage ANTES que la fila en DB: si el borrado en
  // storage falla, la fila sigue existiendo y se puede reintentar. El orden
  // inverso dejaria un objeto huerfano en S3 para siempre.
  async remove(id: number) {
    const testimonial = await this.findById(id);
    await this.storageService.remove(testimonial.imageUrl);
    await this.testimonialRepository.delete(id);
  }
}
