import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ErrorResponseDto } from '../dto/response.dto';

const Responses = {
  INVALID_CREDENTIALS: (data?: unknown) =>
    new ErrorResponseDto('INVALID_CREDENTIALS', 'Usuario o contrasena incorrectos', data),
  USER_NOT_FOUND: (data?: unknown) =>
    new ErrorResponseDto('USER_NOT_FOUND', 'No se encontro un usuario con ese identificador', data),
  USER_INACTIVE: (data?: unknown) =>
    new ErrorResponseDto('USER_INACTIVE', 'El usuario esta dado de baja', data),
  USERNAME_TAKEN: (data?: unknown) =>
    new ErrorResponseDto('USERNAME_TAKEN', 'Ese nombre de usuario ya esta en uso', data),
  INSUFFICIENT_ROLE: (data?: unknown) =>
    new ErrorResponseDto('INSUFFICIENT_ROLE', 'No tienes permisos para realizar esta accion', data),
};

const Exceptions = {
  INVALID_CREDENTIALS: (data?: unknown) => new UnauthorizedException(Responses.INVALID_CREDENTIALS(data)),
  USER_NOT_FOUND: (data?: unknown) => new UnauthorizedException(Responses.USER_NOT_FOUND(data)),
  USER_INACTIVE: (data?: unknown) => new UnauthorizedException(Responses.USER_INACTIVE(data)),
  USERNAME_TAKEN: (data?: unknown) => new ForbiddenException(Responses.USERNAME_TAKEN(data)),
  INSUFFICIENT_ROLE: (data?: unknown) => new ForbiddenException(Responses.INSUFFICIENT_ROLE(data)),
};

export const AuthErrors = { Responses, Exceptions };
