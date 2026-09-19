import { Module } from '@nestjs/common';
import { StorageModule } from '../../catalog/storage/storage.module';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';
import { TestimonialRepository } from './testimonial.repository';

@Module({
  imports: [StorageModule],
  controllers: [TestimonialsController],
  providers: [TestimonialsService, TestimonialRepository],
  exports: [TestimonialRepository, TestimonialsService],
})
export class TestimonialsModule {}
