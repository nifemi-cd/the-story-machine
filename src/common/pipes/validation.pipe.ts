import { ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import type { FieldError } from '../interfaces/api-response.interface.js';

/**
 * Converts class-validator errors into one FieldError per failed rule.
 * Nested fields get dotted paths, e.g. "profile.url".
 *
 * @param errors errors from class-validator
 * @param parentPath path of the parent field, used when recursing into nested objects
 */
export function toFieldErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    // A field can fail several rules at once (e.g. too short and wrong format)
    const own: FieldError[] = Object.values(error.constraints ?? {}).map(
      (message) => ({
        field,
        message,
        success: false,
      }),
    );
    return [...own, ...toFieldErrors(error.children ?? [], field)];
  });
}

/**
 * The app-wide ValidationPipe. It checks request bodies and query strings
 * against their DTO classes before the controller runs.
 *
 * - whitelist + forbidNonWhitelisted: fields not in the DTO are rejected,
 *   so clients can't set things like `roles` or `passwordHash`.
 * - transform: the controller receives a DTO instance with converted types
 *   (e.g. "?page=2" becomes the number 2).
 * - Failures become a 400 listing every invalid field.
 */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      AppException.validation(toFieldErrors(errors)),
  });
}
