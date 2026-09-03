import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  CATEGORY_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('CATEGORY_NOT_FOUND', 'No se encontro la categoria', data),
  CANDLE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('CANDLE_NOT_FOUND', 'No se encontro la vela/molde', data),
  PACKAGING_TYPE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('PACKAGING_TYPE_NOT_FOUND', 'No se encontro el tipo de empaque', data),
  CARD_TYPE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('CARD_TYPE_NOT_FOUND', 'No se encontro el tipo de tarjeta', data),
  PRODUCT_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('PRODUCT_NOT_FOUND', 'No se encontro el producto', data),
  DUPLICATE_PRODUCT_COMBINATION: (data?: unknown) =>
    new ErrorResponseDto(
      'DUPLICATE_PRODUCT_COMBINATION',
      'Ya existe un producto con esa misma combinacion de vela, empaque y tarjeta',
      data,
    ),
  BOUQUET_REQUIRES_COMPONENTS: (data?: unknown) =>
    new ErrorResponseDto('BOUQUET_REQUIRES_COMPONENTS', 'Un ramo necesita al menos una vela componente', data),
  SIMPLE_PRODUCT_REQUIRES_CANDLE: (data?: unknown) =>
    new ErrorResponseDto('SIMPLE_PRODUCT_REQUIRES_CANDLE', 'Un producto simple necesita una vela', data),
  HAS_DEPENDENTS: (data?: unknown) =>
    new ErrorResponseDto(
      'HAS_DEPENDENTS',
      'No se puede dar de baja: hay productos que dependen de este registro',
      data,
    ),
  PRICE_BELOW_MIN_MARGIN: (data?: unknown) =>
    new ErrorResponseDto(
      'PRICE_BELOW_MIN_MARGIN',
      'Ese precio deja un margen menor al piso configurado',
      data,
    ),
};

const Exceptions = {
  CATEGORY_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.CATEGORY_NOT_FOUND(data)),
  CANDLE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.CANDLE_NOT_FOUND(data)),
  PACKAGING_TYPE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.PACKAGING_TYPE_NOT_FOUND(data)),
  CARD_TYPE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.CARD_TYPE_NOT_FOUND(data)),
  PRODUCT_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.PRODUCT_NOT_FOUND(data)),
  DUPLICATE_PRODUCT_COMBINATION: (data?: unknown) =>
    new ConflictException(Responses.DUPLICATE_PRODUCT_COMBINATION(data)),
  BOUQUET_REQUIRES_COMPONENTS: (data?: unknown) => new BadRequestException(Responses.BOUQUET_REQUIRES_COMPONENTS(data)),
  SIMPLE_PRODUCT_REQUIRES_CANDLE: (data?: unknown) =>
    new BadRequestException(Responses.SIMPLE_PRODUCT_REQUIRES_CANDLE(data)),
  HAS_DEPENDENTS: (data?: unknown) => new ConflictException(Responses.HAS_DEPENDENTS(data)),
  PRICE_BELOW_MIN_MARGIN: (data?: unknown) => new BadRequestException(Responses.PRICE_BELOW_MIN_MARGIN(data)),
};

export const CatalogErrors = { Responses, Exceptions };
