import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception.js';
import type { ApiErrorResponse } from '../interfaces/api-response.interface.js';

/**
 * Catches every error thrown while handling a request and sends it back as
 * `{ success: false, message, errors? }`, so clients always get one error shape.
 *
 * - AppException: its message and field errors are sent as-is.
 * - Nest's built-in exceptions (404, 401, ...): their status and message are kept.
 * - Anything else: becomes a 500 with a generic message, and is logged.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /** Called by Nest with the thrown error; writes the error response. */
  catch(exception: unknown, host: ArgumentsHost) {
    // Only HTTP requests are handled; let other transports deal with their own errors
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    // Errors that aren't HttpExceptions are unexpected bugs, so they become 500s
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Server errors are bugs worth investigating; client errors (4xx) are not
    if (status >= 500) {
      // Express rewrites request.url inside routers; originalUrl keeps the prefix
      this.logger.error(
        `${request.method} ${request.originalUrl ?? request.url} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(this.bodyFor(exception));
  }

  /** Builds the JSON body for the error, leaving out `errors` when empty. */
  private bodyFor(exception: unknown): ApiErrorResponse {
    if (exception instanceof AppException) {
      return exception.errors?.length
        ? {
            success: false,
            message: exception.message,
            errors: exception.errors,
          }
        : { success: false, message: exception.message };
    }

    if (exception instanceof HttpException) {
      return { success: false, message: this.messageOf(exception) };
    }

    // Unknown errors may contain internals, so never echo their message
    return { success: false, message: 'Internal server error' };
  }

  /**
   * Gets a readable message from a built-in Nest exception, whose body can be
   * a string, `{ message: string }` or `{ message: string[] }`.
   */
  private messageOf(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') {
      return body;
    }
    const message = (body as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return typeof message === 'string' ? message : exception.message;
  }
}
