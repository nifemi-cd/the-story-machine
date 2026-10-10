import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.setGlobalPrefix("api"); //this is for api versioning
  app.enableVersioning({
    type: VersioningType.URI, defaultVersion: "1"
  });

  // Enable Helmet security headers
  app.use(helmet());

  // Enable CORS
  app.enableCors({
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });


  await app.listen(process.env.PORT ?? 3000);
  console.log("Application running on " + process.env.PORT);
}
await bootstrap();
