// Filtro global. Normaliza CUALQUIER excepcion (las nuestras del catalogo de
// errores, y las de terceros: ValidationPipe, ThrottlerGuard, AuthGuard de
// passport) al mismo shape { code, description, timestamp, data, path }.
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/response.dto';
import { CommonErrors } from '../errors/common.errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolve(exception, request);
    body.path = request.originalUrl;

    response.status(status).json(body);
  }

  private resolve(exception: unknown, request: Request): { status: number; body: ErrorResponseDto } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      // Nuestras excepciones ya traen un ErrorResponseDto armado (catalogo de errores).
      if (this.isErrorResponseDto(payload)) {
        return { status, body: payload };
      }

      // ValidationPipe (class-validator) devuelve { message: string[] | string, ... }.
      if (status === HttpStatus.BAD_REQUEST) {
        const messages = this.extractValidationMessages(payload);
        return { status, body: CommonErrors.Responses.VALIDATION_ERROR(messages) };
      }

      if (status === HttpStatus.UNAUTHORIZED) {
        const hasAuthHeader = Boolean(request.headers.authorization);
        return {
          status,
          body: hasAuthHeader ? CommonErrors.Responses.INVALID_TOKEN() : CommonErrors.Responses.EMPTY_TOKEN(),
        };
      }

      if (status === HttpStatus.FORBIDDEN) {
        return { status, body: CommonErrors.Responses.INSUFFICIENT_ROLE() };
      }

      if (status === HttpStatus.NOT_FOUND) {
        return { status, body: CommonErrors.Responses.ROUTE_NOT_FOUND() };
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return { status, body: CommonErrors.Responses.TOO_MANY_REQUESTS() };
      }

      if (status === HttpStatus.PAYLOAD_TOO_LARGE) {
        return { status, body: CommonErrors.Responses.FILE_TOO_LARGE() };
      }

      return { status, body: CommonErrors.Responses.VALIDATION_ERROR(payload) };
    }

    // Cualquier otra cosa (un throw de programacion, no de negocio) se loguea
    // completo pero se responde generico: no se le regresa el stack al cliente.
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: CommonErrors.Responses.INTERNAL_ERROR() };
  }

  private isErrorResponseDto(payload: unknown): payload is ErrorResponseDto {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'code' in payload &&
      'description' in payload &&
      'timestamp' in payload
    );
  }

  private extractValidationMessages(payload: unknown): string[] | string {
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      return (payload as { message: string[] | string }).message;
    }
    return 'Solicitud invalida';
  }
}
