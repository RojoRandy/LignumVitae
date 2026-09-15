import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  SUPPLY_TYPE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('SUPPLY_TYPE_NOT_FOUND', 'No se encontro el tipo de insumo', data),
  UNIT_OF_MEASURE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('UNIT_OF_MEASURE_NOT_FOUND', 'No se encontro la unidad de medida', data),
  SYSTEM_ROW_PROTECTED: (data?: unknown) =>
    new ErrorResponseDto('SYSTEM_ROW_PROTECTED', 'No se puede dar de baja ni cambiar el slug de un registro de sistema', data),
  PERIOD_CLOSED: (data?: unknown) =>
    new ErrorResponseDto(
      'PERIOD_CLOSED',
      'El mes de esta compra ya esta cerrado: reabrelo en Cierre mensual si necesitas corregirla',
      data,
    ),
  PURCHASE_ITEM_NEEDS_DESCRIPTION: (data?: unknown) =>
    new ErrorResponseDto(
      'PURCHASE_ITEM_NEEDS_DESCRIPTION',
      'El renglon no trae descripcion y no hay de donde derivarla: falta el insumo, el nombre del activo o la categoria de gasto',
      data,
    ),
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
  SUPPLY_TYPE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.SUPPLY_TYPE_NOT_FOUND(data)),
  UNIT_OF_MEASURE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.UNIT_OF_MEASURE_NOT_FOUND(data)),
  SYSTEM_ROW_PROTECTED: (data?: unknown) => new BadRequestException(Responses.SYSTEM_ROW_PROTECTED(data)),
  PERIOD_CLOSED: (data?: unknown) => new BadRequestException(Responses.PERIOD_CLOSED(data)),
  PURCHASE_ITEM_NEEDS_DESCRIPTION: (data?: unknown) => new BadRequestException(Responses.PURCHASE_ITEM_NEEDS_DESCRIPTION(data)),
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
