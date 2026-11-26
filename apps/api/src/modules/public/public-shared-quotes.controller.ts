// Lista compartida del cotizador de la landing. Sin @Auth(): el alta la protegen
// un limite propio de 5/min por IP (mas estricto que el global) y la validacion
// del DTO; la consulta se hace por token.
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuoteRequestsService } from '../sales/quote-requests/quote-requests.service';
import { CreateSharedQuoteDto } from './dto/create-shared-quote.dto';

@ApiTags('Public')
@Controller('public/shared-quotes')
export class PublicSharedQuotesController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateSharedQuoteDto) {
    return this.quoteRequestsService.createShared(dto);
  }

  @Get(':token')
  async findByToken(@Param('token') token: string) {
    return this.quoteRequestsService.findShared(token);
  }
}
