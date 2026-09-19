// Cotizador publico de la landing. Sin @Auth(): lo protegen el honeypot, un
// limite propio de 5/min por IP (mas estricto que el global) y la validacion
// del DTO.
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { QuoteRequestsService } from '../sales/quote-requests/quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';

@ApiTags('Public')
@Controller('public/quote-requests')
export class PublicQuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateQuoteRequestDto) {
    // Bot: se le responde como si todo saliera bien para que no reintente.
    if (dto.website) return { id: 0, createdAt: new Date() };
    return this.quoteRequestsService.createFromWeb(dto);
  }
}
