import { Logger, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './user/user.module.js';
import { StoryModule } from './story/story.module.js';
import { ChapterModule } from './chapter/chapter.module.js';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { createLoggerParams } from './common/logger/logger.config.js';

/**
 * Root module: loads config from .env, sets up logging and the MongoDB
 * connection, and registers the app-wide validation, response format
 * and error handling.
 */
@Module({
  imports: [
    // Reads .env into ConfigService, available in every module
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Readable logs locally, JSON in production; level set by LOG_LEVEL
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createLoggerParams({
          production: configService.get('NODE_ENV') === 'production',
          level: configService.get<string>('LOG_LEVEL') ?? 'info',
        }),
    }),
    // Connects to MONGO_URI and logs connection changes
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        connectionFactory: (connection) => {
          const logger = new Logger('MongoDB');
          if (connection.readyState === 1) {
            logger.log(
              `Connected to MongoDB: ${connection.host}:${connection.port}/${connection.name}`,
            );
          }
          connection.on('connected', () => logger.log('Connected'));
          connection.on('disconnected', () => logger.warn('Disconnected'));
          connection.on('error', (err: Error) => logger.error(err.message));
          return connection;
        },
      }),
    }),
    UserModule,
    StoryModule,
    ChapterModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered here rather than in main.ts so tests built from AppModule
    // get the same validation and response format
    // Validates request bodies and query strings against their DTOs
    { provide: APP_PIPE, useFactory: createValidationPipe },
    // Wraps successful responses in { success, message, data }
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Turns every error into { success: false, message, errors? }
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
