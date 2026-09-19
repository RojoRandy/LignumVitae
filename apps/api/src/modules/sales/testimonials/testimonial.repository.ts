import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TestimonialRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(args: Prisma.TestimonialFindManyArgs) {
    return this.prisma.testimonial.findMany(args);
  }

  count(where: Prisma.TestimonialWhereInput) {
    return this.prisma.testimonial.count({ where });
  }

  findById(id: number) {
    return this.prisma.testimonial.findUnique({ where: { id } });
  }

  create(data: Prisma.TestimonialCreateInput) {
    return this.prisma.testimonial.create({ data });
  }

  update(id: number, data: Prisma.TestimonialUpdateInput) {
    return this.prisma.testimonial.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.prisma.testimonial.delete({ where: { id } });
  }
}
