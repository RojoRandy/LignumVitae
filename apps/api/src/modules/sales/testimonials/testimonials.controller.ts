import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRoles } from '@prisma/client';
import { CatalogErrors } from '../../../common/errors/catalog.errors';
import { Auth } from '../../auth/decorators/auth.decorator';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto/create-testimonial.dto';
import { FindTestimonialsQueryDto } from './dto/find-testimonials.query.dto';

// Una captura de WhatsApp en PNG pasa facil los 5 MB que usan las fotos de
// producto: el testimonio necesita mas margen.
const TESTIMONIAL_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

@ApiTags('Sales')
@Auth(UserRoles.admin, UserRoles.super_user)
@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  findAll(@Query() query: FindTestimonialsQueryDto) {
    return this.testimonialsService.findAll(query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: TESTIMONIAL_IMAGE_MAX_BYTES } }))
  create(@Body() dto: CreateTestimonialDto, @UploadedFile() file: Express.Multer.File) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw CatalogErrors.Exceptions.INVALID_IMAGE_TYPE();
    }
    return this.testimonialsService.create(dto, file);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testimonialsService.remove(id);
  }
}
