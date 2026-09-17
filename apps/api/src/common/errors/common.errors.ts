// Catalogo de errores transversales. Regla dura: nunca
// `throw new BadRequestException('texto suelto')`. Cada error tiene un
// codigo en INGLES_MAYUSCULAS (para que el admin pueda ramificar sobre el
// codigo, no sobre el texto) y una descripcion en espanol (para que se
// pueda mostrar directo al usuario). El par Responses/Exceptions existe para
// que Swagger documente el mismo objeto que se lanza en runtime.
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  VALIDATION_ERROR: (data?: unknown) =>
    new ErrorResponseDto('VALIDATION_ERROR', 'Los datos enviados no son validos', data),
  ROUTE_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('ROUTE_NOT_FOUND', 'La ruta solicitada no existe', data),
  TOO_MANY_REQUESTS: (data?: unknown) =>
    new ErrorResponseDto('TOO_MANY_REQUESTS', 'Demasiadas solicitudes, intenta de nuevo en un momento', data),
  FILE_TOO_LARGE: (data?: unknown) =>
    new ErrorResponseDto('FILE_TOO_LARGE', 'El archivo excede el tamano maximo permitido', data),
  UNSUPPORTED_FILE_TYPE: (data?: unknown) =>
    new ErrorResponseDto('UNSUPPORTED_FILE_TYPE', 'El tipo de archivo no esta permitido', data),
  INTERNAL_ERROR: (data?: unknown) =>
    new ErrorResponseDto('INTERNAL_ERROR', 'Ocurrio un error inesperado', data),
  INVALID_TOKEN: (data?: unknown) =>
    new ErrorResponseDto('INVALID_TOKEN', 'El token de autenticacion no es valido', data),
  EMPTY_TOKEN: (data?: unknown) =>
    new ErrorResponseDto('EMPTY_TOKEN', 'Falta el token de autenticacion', data),
  INSUFFICIENT_ROLE: (data?: unknown) =>
    new ErrorResponseDto('INSUFFICIENT_ROLE', 'No tienes permisos para realizar esta accion', data),
  DUPLICATE_VALUE: (data?: unknown) =>
    new ErrorResponseDto('DUPLICATE_VALUE', 'Ya existe un registro con ese mismo valor', data),
  RECORD_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('RECORD_NOT_FOUND', 'El registro que se intento modificar ya no existe', data),
};

const Exceptions = {
  VALIDATION_ERROR: (data?: unknown) => new BadRequestException(Responses.VALIDATION_ERROR(data)),
  ROUTE_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.ROUTE_NOT_FOUND(data)),
  TOO_MANY_REQUESTS: (data?: unknown) => new BadRequestException(Responses.TOO_MANY_REQUESTS(data)),
  FILE_TOO_LARGE: (data?: unknown) => new BadRequestException(Responses.FILE_TOO_LARGE(data)),
  UNSUPPORTED_FILE_TYPE: (data?: unknown) => new BadRequestException(Responses.UNSUPPORTED_FILE_TYPE(data)),
  INTERNAL_ERROR: (data?: unknown) => new InternalServerErrorException(Responses.INTERNAL_ERROR(data)),
  INVALID_TOKEN: (data?: unknown) => new UnauthorizedException(Responses.INVALID_TOKEN(data)),
  EMPTY_TOKEN: (data?: unknown) => new UnauthorizedException(Responses.EMPTY_TOKEN(data)),
  INSUFFICIENT_ROLE: (data?: unknown) => new ForbiddenException(Responses.INSUFFICIENT_ROLE(data)),
  DUPLICATE_VALUE: (data?: unknown) => new ConflictException(Responses.DUPLICATE_VALUE(data)),
  RECORD_NOT_FOUND: (data?: unknown) => new NotFoundException(Responses.RECORD_NOT_FOUND(data)),
};

export const CommonErrors = { Responses, Exceptions };
