// Envuelve TODA respuesta exitosa en { data, success, message }. Los
// controllers devuelven el objeto pelado; este interceptor es el UNICO
// lugar donde se arma el envelope.
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Envelope<T> {
  data: T;
  success: boolean;
  message: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, Envelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        data,
        success: true,
        message: 'OK',
      })),
    );
  }
}
