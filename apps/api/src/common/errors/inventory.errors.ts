import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  SUPPLY_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('SUPPLY_NOT_FOUND', 'No se encontro el insumo', data),
  SUPPLY_IS_WAX: (data?: unknown) =>
    new ErrorResponseDto(
      'SUPPLY_IS_WAX',
      'La cera no se agrega como insumo de un producto: se deriva de los gramos de la vela',
      data,
    ),
  PURCHASE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('PURCHASE_NOT_FOUND', 'No se encontro la compra', data),
  ASSET_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('ASSET_NOT_FOUND', 'No se encontro el activo', data),
  EXPENSE_CATEGORY_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('EXPENSE_CATEGORY_NOT_FOUND', 'No se encontro la categoria de gasto', data),
  INSUFFICIENT_STOCK: (data?: unknown) =>
    new ErrorResponseDto('INSUFFICIENT_STOCK', 'No hay existencia suficiente de este insumo', data),
  OVERHEAD_PERIOD_ALREADY_CLOSED: (data?: unknown) =>
    new ErrorResponseDto('OVERHEAD_PERIOD_ALREADY_CLOSED', 'Ese mes ya fue cerrado', data),
  OVERHEAD_PERIOD_NOT_CLOSED: (data?: unknown) =>
    new ErrorResponseDto('OVERHEAD_PERIOD_NOT_CLOSED', 'Ese mes no esta cerrado, no hay nada que reabrir', data),
};

const Exceptions = {
  SUPPLY_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.SUPPLY_NOT_FOUND(data)),
  SUPPLY_IS_WAX: (data?: unknown) => new BadRequestException(Responses.SUPPLY_IS_WAX(data)),
  PURCHASE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.PURCHASE_NOT_FOUND(data)),
  ASSET_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.ASSET_NOT_FOUND(data)),
  EXPENSE_CATEGORY_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.EXPENSE_CATEGORY_NOT_FOUND(data)),
  INSUFFICIENT_STOCK: (data?: unknown) => new BadRequestException(Responses.INSUFFICIENT_STOCK(data)),
  OVERHEAD_PERIOD_ALREADY_CLOSED: (data?: unknown) => new ConflictException(Responses.OVERHEAD_PERIOD_ALREADY_CLOSED(data)),
  OVERHEAD_PERIOD_NOT_CLOSED: (data?: unknown) => new ConflictException(Responses.OVERHEAD_PERIOD_NOT_CLOSED(data)),
};

export const InventoryErrors = { Responses, Exceptions };
