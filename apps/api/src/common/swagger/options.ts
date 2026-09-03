import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerOptions = new DocumentBuilder()
  .setTitle('Lignum Vitae API')
  .setDescription(
    'Catalogo, inventario, cotizaciones, pedidos y reportes para Lignum Vitae — velas artesanales personalizadas.',
  )
  .setVersion('0.1.0')
  .addBearerAuth()
  .addTag('Auth')
  .addTag('Settings')
  .addTag('Catalog')
  .addTag('Inventory')
  .addTag('Sales')
  .addTag('Reports')
  .addTag('Dashboard')
  .addTag('Uploads')
  .addTag('Public')
  .build();
