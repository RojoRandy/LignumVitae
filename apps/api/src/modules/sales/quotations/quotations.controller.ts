import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { QuotationsService } from './quotations.service';
import { PreviewQuotationTotalsUseCase } from './usecases/preview-quotation-totals.usecase';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthUser } from '../../auth/decorators/auth-user.decorator';
import { CreateQuotationDto, UpdateQuotationDto } from './dto/create-quotation.dto';
import { PreviewQuotationTotalsDto } from './dto/preview-quotation-totals.dto';
import { FindQuotationsQueryDto } from './dto/find-quotations.query.dto';
import { PdfService } from '../../pdf/pdf.service';

@ApiTags('Sales')
@Auth()
@Controller('quotations')
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly previewQuotationTotalsUseCase: PreviewQuotationTotalsUseCase,
    private readonly pdfService: PdfService,
  ) {}

  @Get()
  findAll(@Query() query: FindQuotationsQueryDto) {
    return this.quotationsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.findById(id);
  }

  @Post('preview-totals')
  previewTotals(@Body() dto: PreviewQuotationTotalsDto) {
    return this.previewQuotationTotalsUseCase.execute(dto);
  }

  @Post()
  create(@Body() dto: CreateQuotationDto, @AuthUser('id') userId: number) {
    return this.quotationsService.create(dto, userId);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuotationDto) {
    return this.quotationsService.update(id, dto);
  }

  @Post(':id/send')
  send(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.send(id);
  }

  @Post(':id/reject')
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.quotationsService.reject(id);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id', ParseIntPipe) id: number, @AuthUser('id') userId: number) {
    return this.quotationsService.duplicate(id, userId);
  }

  // @Res({ passthrough: false }): unico controller del repo que responde
  // binario -- se salta el ApiResponseInterceptor global a proposito, para
  // mandar el PDF crudo con su propio Content-Type en vez de envolverlo en
  // el sobre {data, success, message} de toda otra respuesta.
  @Get(':id/pdf')
  async pdf(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: false }) res: Response) {
    const quotation = await this.quotationsService.findById(id);
    const buffer = await this.pdfService.renderQuotationPdf(quotation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quotation.folio}.pdf"`);
    res.send(buffer);
  }
}
