import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Auth } from '../../auth/decorators/auth.decorator';
import { QuoteRequestsService } from './quote-requests.service';
import { FindQuoteRequestsQueryDto } from './dto/find-quote-requests.query.dto';
import { DismissQuoteRequestDto } from './dto/dismiss-quote-request.dto';

@ApiTags('Sales')
@Auth()
@Controller('quote-requests')
export class QuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @Get()
  findAll(@Query() query: FindQuoteRequestsQueryDto) {
    return this.quoteRequestsService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.quoteRequestsService.findById(id);
  }

  @Post(':id/dismiss')
  dismiss(@Param('id', ParseIntPipe) id: number, @Body() dto: DismissQuoteRequestDto) {
    return this.quoteRequestsService.dismiss(id, dto.reason);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.quoteRequestsService.deactivate(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Post(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.quoteRequestsService.restore(id);
  }

  @Auth(UserRoles.admin, UserRoles.super_user)
  @Delete(':id/permanent')
  deletePermanently(@Param('id', ParseIntPipe) id: number) {
    return this.quoteRequestsService.deletePermanently(id);
  }
}
