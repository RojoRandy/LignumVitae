// Antes de esto, cualquier P2002/P2025 de Prisma que no se atrapara a mano
// en un servicio se colaba como 500 INTERNAL_ERROR generico -- lo que paso
// al dar de alta una tarjeta con un nombre duplicado del seed. Se prueba el
// filtro directo, sin levantar Nest, porque es el unico punto por el que
// pasan TODAS las excepciones de la API.
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

const fakeHost = (path = '/api/card-types') => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    host: {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ originalUrl: path, headers: {} }),
      }),
    } as never,
    status,
    json,
  };
};

it('traduce un choque de valor unico (P2002) a 409 en vez de un 500 generico', () => {
  const filter = new HttpExceptionFilter();
  const { host, status, json } = fakeHost();
  const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`name`)', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['name'] },
  });

  filter.catch(error, host);

  expect(status).toHaveBeenCalledWith(409);
  expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DUPLICATE_VALUE', data: { fields: ['name'] } }));
});

it('traduce un registro ya borrado (P2025) a 404', () => {
  const filter = new HttpExceptionFilter();
  const { host, status, json } = fakeHost();
  const error = new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
    code: 'P2025',
    clientVersion: 'test',
  });

  filter.catch(error, host);

  expect(status).toHaveBeenCalledWith(404);
  expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RECORD_NOT_FOUND' }));
});
