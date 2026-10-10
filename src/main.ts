import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.setGlobalPrefix("api"); //this is for api versioning
  app.enableVersioning({
    type: VersioningType.URI, defaultVersion: "1"
  });


  await app.listen(process.env.PORT ?? 3000);
  console.log("Application running on " + process.env.PORT);
}
await bootstrap();
