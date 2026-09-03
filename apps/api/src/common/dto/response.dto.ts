// Envelope de respuesta. TODO endpoint responde { data, success, message } y
// TODO error responde { code, description, timestamp, data, path }. Los
// controllers devuelven el objeto pelado (ver ApiResponseInterceptor);
// envolver a mano en un controller es un error.
import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiCreatedResponse, ApiProperty, ApiResponse, getSchemaPath } from '@nestjs/swagger';

export class SchemaResponseDto<T> {
  @ApiProperty()
  data: T;

  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;
}

export class ErrorResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ required: false })
  data?: unknown;

  @ApiProperty({ required: false })
  path?: string;

  constructor(code: string, description: string, data?: unknown) {
    this.code = code;
    this.description = description;
    this.timestamp = new Date().toISOString();
    this.data = data;
  }
}

export class PaginatedDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  pages: number;
}

/** Documenta un 200 cuyo `data` es una instancia de Dto. */
export const ApiOkSchemaResponse = <T extends Type>(dto: T) =>
  applyDecorators(
    ApiExtraModels(SchemaResponseDto, dto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(SchemaResponseDto) },
          { properties: { data: { $ref: getSchemaPath(dto) } } },
        ],
      },
    }),
  );

/** Documenta un 200 cuyo `data` es un arreglo de instancias de Dto. */
export const ApiOkSchemaArrayResponse = <T extends Type>(dto: T) =>
  applyDecorators(
    ApiExtraModels(SchemaResponseDto, dto),
    ApiOkResponse({
      schema: {
        allOf: [
          {
            properties: {
              data: { type: 'array', items: { $ref: getSchemaPath(dto) } },
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        ],
      },
    }),
  );

/** Documenta un 201 cuyo `data` es una instancia de Dto. */
export const ApiCreatedSchemaResponse = <T extends Type>(dto: T) =>
  applyDecorators(
    ApiExtraModels(SchemaResponseDto, dto),
    ApiCreatedResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(SchemaResponseDto) },
          { properties: { data: { $ref: getSchemaPath(dto) } } },
        ],
      },
    }),
  );

const errorResponseFor = (status: number, examples: ErrorResponseDto[]) =>
  ApiResponse({
    status,
    schema: {
      type: 'object',
      example: examples[0],
    },
  });

export const ApiBadRequestResponseError = (examples: ErrorResponseDto[]) => errorResponseFor(400, examples);
export const ApiUnauthorizedResponseError = (examples: ErrorResponseDto[]) => errorResponseFor(401, examples);
export const ApiForbiddenResponseError = (examples: ErrorResponseDto[]) => errorResponseFor(403, examples);
export const ApiNotFoundResponseError = (examples: ErrorResponseDto[]) => errorResponseFor(404, examples);
export const ApiInternalServerErrorResponseError = (examples: ErrorResponseDto[]) => errorResponseFor(500, examples);
