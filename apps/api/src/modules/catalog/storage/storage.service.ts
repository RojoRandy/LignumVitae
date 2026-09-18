import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CatalogErrors } from '../../../common/errors/catalog.errors';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  private get driver() {
    return this.configService.get<string>('STORAGE_DRIVER') ?? 'local';
  }

  private get uploadsDir() {
    return join(process.cwd(), this.configService.get<string>('UPLOADS_DIR') ?? 'uploads');
  }

  private get publicBaseUrl() {
    const bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    const region = this.configService.getOrThrow<string>('S3_REGION');
    return (this.configService.get<string>('S3_PUBLIC_BASE_URL') || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/, '');
  }

  /** "Carpeta" dentro del bucket (p. ej. "development" / "production") para
   *  compartir un mismo bucket entre ambientes sin que se pisen los
   *  archivos. Vacio por defecto: los objetos quedan en la raiz, igual que
   *  antes de que existiera esta variable. */
  private get s3KeyPrefix() {
    return (this.configService.get<string>('S3_KEY_PREFIX') ?? '').replace(/^\/+|\/+$/g, '');
  }

  private getS3Client() {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.configService.getOrThrow<string>('S3_REGION'),
        credentials: {
          accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
        },
      });
    }
    return this.s3Client;
  }

  async save(buffer: Buffer, mimetype: string): Promise<string> {
    const extension = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mimetype];
    if (!extension) throw CatalogErrors.Exceptions.INVALID_IMAGE_TYPE();
    const key = `${randomUUID()}${extension}`;
    if (this.driver === 'local') {
      await mkdir(this.uploadsDir, { recursive: true });
      await writeFile(join(this.uploadsDir, key), buffer);
      return `/static/${key}`;
    }
    if (this.driver === 's3') {
      const baseUrl = this.publicBaseUrl;
      const prefix = this.s3KeyPrefix;
      const objectKey = prefix ? `${prefix}/${key}` : key;
      await this.getS3Client().send(new PutObjectCommand({
        Bucket: this.configService.getOrThrow<string>('S3_BUCKET'),
        Key: objectKey,
        Body: buffer,
        ContentType: mimetype,
      }));
      return `${baseUrl}/${objectKey}`;
    }
    throw new Error(`Proveedor de almacenamiento no soportado: ${this.driver}`);
  }

  async remove(url: string): Promise<void> {
    try {
      if (this.driver === 'local') {
        const match = /^\/static\/([^/\\]+)$/.exec(url);
        if (match && match[1] !== '.' && match[1] !== '..') {
          await unlink(join(this.uploadsDir, match[1]));
          return;
        }
      } else if (this.driver === 's3') {
        const prefix = `${this.publicBaseUrl}/`;
        if (url.startsWith(prefix) && url.length > prefix.length && !/[?#]/.test(url)) {
          await this.getS3Client().send(new DeleteObjectCommand({
            Bucket: this.configService.getOrThrow<string>('S3_BUCKET'),
            Key: url.slice(prefix.length),
          }));
          return;
        }
      }
      this.logger.warn('No se reconoce la URL de la imagen; se omite el borrado en storage');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn('No se pudo borrar la imagen en storage; se continua con el borrado en DB');
      }
    }
  }
}
