// S3_KEY_PREFIX comparte un mismo bucket entre ambientes (p. ej.
// "development" / "production") sin que sus archivos se pisen. Este test
// cubre solo esa logica de armado/lectura de key -- el resto de
// StorageService (driver local, tolerancia a fallos de remove) no cambio.
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/client-s3', () => {
  const send = jest.fn().mockResolvedValue({});
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  };
});

const configService = (env: Record<string, string>) => ({
  get: (key: string) => env[key],
  getOrThrow: (key: string) => {
    if (env[key] === undefined) throw new Error(`Falta ${key}`);
    return env[key];
  },
});

const baseEnv = { STORAGE_DRIVER: 's3', S3_BUCKET: 'bucket', S3_REGION: 'us-west2', S3_ACCESS_KEY_ID: 'id', S3_SECRET_ACCESS_KEY: 'secret' };

// El mock de S3Client comparte un unico `send` entre instancias (asi es como
// se stubea el SDK); se limpia el historial de llamadas entre tests para
// que cada uno lea solo lo que el mismo genero.
afterEach(() => jest.clearAllMocks());

it('sube el objeto bajo la carpeta de S3_KEY_PREFIX cuando esta configurada', async () => {
  const service = new StorageService(configService({ ...baseEnv, S3_KEY_PREFIX: 'development' }) as never);
  const url = await service.save(Buffer.from('img'), 'image/jpeg');

  expect(url).toMatch(/^https:\/\/bucket\.s3\.us-west2\.amazonaws\.com\/development\/[^/]+\.jpg$/);
  const send = new S3Client({}).send as jest.Mock;
  const key = (send.mock.calls[0][0] as { input: { Key: string } }).input.Key;
  expect(key.startsWith('development/')).toBe(true);
});

it('sube a la raiz del bucket cuando S3_KEY_PREFIX no esta configurada', async () => {
  const service = new StorageService(configService(baseEnv) as never);
  const url = await service.save(Buffer.from('img'), 'image/png');
  expect(url).toMatch(/^https:\/\/bucket\.s3\.us-west2\.amazonaws\.com\/[^/]+\.png$/);
});

it('remove() borra la key completa (con carpeta) tal como quedo en la URL guardada', async () => {
  const service = new StorageService(configService({ ...baseEnv, S3_KEY_PREFIX: '/development/' }) as never);
  await service.remove('https://bucket.s3.us-west2.amazonaws.com/development/abc123.jpg');
  const send = new S3Client({}).send as jest.Mock;
  const lastCall = send.mock.calls[send.mock.calls.length - 1][0] as { input: { Key: string } };
  expect(lastCall.input.Key).toBe('development/abc123.jpg');
});
