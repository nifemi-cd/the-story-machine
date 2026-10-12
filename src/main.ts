import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix('api'); //this is for api versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable Helmet security headers
  app.use(helmet());

  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Application running on ' + process.env.PORT);
}
await bootstrap();
