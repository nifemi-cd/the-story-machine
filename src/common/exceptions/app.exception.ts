import { HttpException, HttpStatus } from '@nestjs/common';
import type {
  ApiErrorResponse,
  FieldError,
} from '../interfaces/api-response.interface.js';

/**
 * An HTTP error that can also say which request fields were wrong.
 * The exception filter turns it into `{ success: false, message, errors? }`.
 *
 * For errors without field details, Nest's built-in exceptions
 * (NotFoundException etc.) work as well.
 */
export class AppException extends HttpException {
  // Per-field problems, e.g. [{ field: 'email', message: 'email must be an email' }]
  readonly errors?: FieldError[];

  constructor(status: HttpStatus, message: string, errors?: FieldError[]) {
    const body: ApiErrorResponse = { success: false, message, errors };
    super(body, status);
    this.errors = errors;
  }

  /** 400: the request is malformed, e.g. an invalid id in the URL. */
  static badRequest(message: string, errors?: FieldError[]) {
    return new AppException(HttpStatus.BAD_REQUEST, message, errors);
  }

  /** 400: the body or query failed DTO validation (used by the ValidationPipe). */
  static validation(errors: FieldError[], message = 'Validation failed') {
    return new AppException(HttpStatus.BAD_REQUEST, message, errors);
  }

  /** 409: the request clashes with existing data, e.g. a taken username. */
  static conflict(message: string, errors?: FieldError[]) {
    return new AppException(HttpStatus.CONFLICT, message, errors);
  }

  /** 404: the requested resource doesn't exist. */
  static notfound(message: string, error?: FieldError[]) {
    return new AppException(HttpStatus.NOT_FOUND, message, error);
  }
}
