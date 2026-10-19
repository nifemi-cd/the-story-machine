import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

/**
 * Creates the Nest app, applies HTTP-level settings (URL prefix, versioning,
 * docs, security headers, CORS, logging) and starts listening.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Hold startup logs until the pino logger below is attached
    bufferLogs: true,
  });

  // Every route starts with /api/v1, e.g. /api/v1/user
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // API docs at /api/docs (validation, response format and errors are
  // registered globally in AppModule)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('The Story Machine API')
    .setVersion('1')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  // Enable Helmet security headers
  app.use(helmet());

  // Route Nest's own logs through pino so everything uses one format
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(
    `Listening on http://localhost:${port}/api (docs at /api/docs)`,
    'Bootstrap',
  );
}
await bootstrap();
