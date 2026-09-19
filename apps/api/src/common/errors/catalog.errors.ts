import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  PRODUCT_MUST_BE_INACTIVE: (data?: unknown) =>
    new ErrorResponseDto('PRODUCT_MUST_BE_INACTIVE', 'Da de baja el producto antes de eliminarlo permanentemente', data),
  PRODUCT_IMAGE_LIMIT_REACHED: (data?: unknown) =>
    new ErrorResponseDto('PRODUCT_IMAGE_LIMIT_REACHED', 'Limite de imagenes: maximo 10 por producto', data),
  PRODUCT_IMAGE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('PRODUCT_IMAGE_NOT_FOUND', 'No se encontro la imagen', data),
  INVALID_IMAGE_TYPE: (data?: unknown) =>
    new ErrorResponseDto('INVALID_IMAGE_TYPE', 'Se requiere una imagen JPEG, PNG o WebP', data),
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
  // Mensaje generico a proposito: este error lo reutilizan dar de baja
  // (insumos, velas, empaques, tarjetas, categorias...) Y eliminar
  // permanentemente (productos), y lo que depende no siempre son
  // "productos" (p. ej. insumos dependiendo de un tipo o una unidad). El
  // detalle especifico va en `data`, que cada llamada arma a su manera.
  HAS_DEPENDENTS: (data?: unknown) =>
    new ErrorResponseDto(
      'HAS_DEPENDENTS',
      'No se puede completar: hay registros que dependen de este',
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
  PRODUCT_MUST_BE_INACTIVE: (data?: unknown) => new BadRequestException(Responses.PRODUCT_MUST_BE_INACTIVE(data)),
  PRODUCT_IMAGE_LIMIT_REACHED: (data?: unknown) => new BadRequestException(Responses.PRODUCT_IMAGE_LIMIT_REACHED(data)),
  PRODUCT_IMAGE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.PRODUCT_IMAGE_NOT_FOUND(data)),
  INVALID_IMAGE_TYPE: (data?: unknown) => new BadRequestException(Responses.INVALID_IMAGE_TYPE(data)),
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
