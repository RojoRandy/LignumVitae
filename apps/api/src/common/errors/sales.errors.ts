import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  CUSTOMER_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('CUSTOMER_NOT_FOUND', 'No se encontro el cliente', data),
  QUOTATION_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('QUOTATION_NOT_FOUND', 'No se encontro la cotizacion', data),
  QUOTATION_ALREADY_CONVERTED: (data?: unknown) =>
    new ErrorResponseDto('QUOTATION_ALREADY_CONVERTED', 'Esta cotizacion ya se convirtio en pedido', data),
  QUOTATION_EXPIRED: (data?: unknown) =>
    new ErrorResponseDto('QUOTATION_EXPIRED', 'Esta cotizacion ya vencio', data),
  ORDER_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('ORDER_NOT_FOUND', 'No se encontro el pedido', data),
  PAYMENT_EXCEEDS_BALANCE: (data?: unknown) =>
    new ErrorResponseDto('PAYMENT_EXCEEDS_BALANCE', 'El abono excede el saldo pendiente del pedido', data),
  QUOTE_REQUEST_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('QUOTE_REQUEST_NOT_FOUND', 'No se encontro la solicitud de cotizacion', data),
  QUOTE_REQUEST_NOT_NEW: (data?: unknown) =>
    new ErrorResponseDto('QUOTE_REQUEST_NOT_NEW', 'Esta solicitud ya se convirtio o se descarto', data),
  LEAD_TIME_TOO_SHORT: (data?: unknown) =>
    new ErrorResponseDto(
      'LEAD_TIME_TOO_SHORT',
      'La fecha del evento no cumple con el minimo de dias de anticipacion',
      data,
    ),
  BELOW_MIN_MARGIN: (data?: unknown) =>
    new ErrorResponseDto('BELOW_MIN_MARGIN', 'El precio fijado deja menos margen del minimo permitido', data),
  INVALID_FRAGRANCE_SUPPLY: (data?: unknown) =>
    new ErrorResponseDto('INVALID_FRAGRANCE_SUPPLY', 'El aroma elegido no existe, esta dado de baja o ya no esta marcado como aroma', data),
  QUOTATION_EMPTY: (data?: unknown) =>
    new ErrorResponseDto('QUOTATION_EMPTY', 'La cotizacion necesita al menos un renglon', data),
  QUOTATION_NOT_EDITABLE: (data?: unknown) =>
    new ErrorResponseDto('QUOTATION_NOT_EDITABLE', 'Solo se puede editar o enviar una cotizacion en borrador', data),
  QUOTATION_NOT_ACCEPTABLE: (data?: unknown) =>
    new ErrorResponseDto('QUOTATION_NOT_ACCEPTABLE', 'La cotizacion debe estar enviada para aceptarse o rechazarse', data),
  CUSTOMER_HAS_ACTIVE_ORDERS: (data?: unknown) =>
    new ErrorResponseDto('CUSTOMER_HAS_ACTIVE_ORDERS', 'El cliente tiene pedidos activos, no se puede dar de baja', data),
  PAYMENT_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('PAYMENT_NOT_FOUND', 'No se encontro el pago', data),
  TESTIMONIAL_NOT_FOUND: (data?: unknown) => new ErrorResponseDto('TESTIMONIAL_NOT_FOUND', 'No se encontro el testimonio', data),
};

const Exceptions = {
  CUSTOMER_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.CUSTOMER_NOT_FOUND(data)),
  QUOTATION_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.QUOTATION_NOT_FOUND(data)),
  QUOTATION_ALREADY_CONVERTED: (data?: unknown) => new ConflictException(Responses.QUOTATION_ALREADY_CONVERTED(data)),
  QUOTATION_EXPIRED: (data?: unknown) => new BadRequestException(Responses.QUOTATION_EXPIRED(data)),
  ORDER_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.ORDER_NOT_FOUND(data)),
  PAYMENT_EXCEEDS_BALANCE: (data?: unknown) => new BadRequestException(Responses.PAYMENT_EXCEEDS_BALANCE(data)),
  QUOTE_REQUEST_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.QUOTE_REQUEST_NOT_FOUND(data)),
  QUOTE_REQUEST_NOT_NEW: (data?: unknown) => new ConflictException(Responses.QUOTE_REQUEST_NOT_NEW(data)),
  LEAD_TIME_TOO_SHORT: (data?: unknown) => new BadRequestException(Responses.LEAD_TIME_TOO_SHORT(data)),
  BELOW_MIN_MARGIN: (data?: unknown) => new BadRequestException(Responses.BELOW_MIN_MARGIN(data)),
  INVALID_FRAGRANCE_SUPPLY: (data?: unknown) => new BadRequestException(Responses.INVALID_FRAGRANCE_SUPPLY(data)),
  QUOTATION_EMPTY: (data?: unknown) => new BadRequestException(Responses.QUOTATION_EMPTY(data)),
  QUOTATION_NOT_EDITABLE: (data?: unknown) => new BadRequestException(Responses.QUOTATION_NOT_EDITABLE(data)),
  QUOTATION_NOT_ACCEPTABLE: (data?: unknown) => new BadRequestException(Responses.QUOTATION_NOT_ACCEPTABLE(data)),
  CUSTOMER_HAS_ACTIVE_ORDERS: (data?: unknown) => new ConflictException(Responses.CUSTOMER_HAS_ACTIVE_ORDERS(data)),
  PAYMENT_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.PAYMENT_NOT_FOUND(data)),
  TESTIMONIAL_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.TESTIMONIAL_NOT_FOUND(data)),
};

export const SalesErrors = { Responses, Exceptions };
