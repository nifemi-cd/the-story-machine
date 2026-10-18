import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorDoc, PaginationMetaDoc } from './api-response.docs.js';

/**
 * Documents a successful response wrapped by the ResponseInterceptor:
 * `{ success: true, message, data }`, plus `meta` for paginated lists.
 *
 * @param model class describing what goes in `data`
 * @param options.status HTTP status, 200 by default
 * @param options.description shown next to the status, usually the @ResponseMessage
 * @param options.paginated true when `data` is a list with pagination `meta`
 *
 * @example
 * @ApiEnvelope(UserResponseDto, { status: 201, description: 'User created' })
 */
export function ApiEnvelope(
  model: Type<unknown>,
  options: { status?: number; description?: string; paginated?: boolean } = {},
) {
  const { status = HttpStatus.OK, description, paginated = false } = options;

  // A single item, or a list of them for paginated responses
  const data = paginated
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    // Registers the models so the $refs above resolve in the docs
    ApiExtraModels(model, PaginationMetaDoc),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: [
          'success',
          'message',
          'data',
          ...(paginated ? ['meta'] : []),
        ],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: description ?? 'Success' },
          data,
          ...(paginated
            ? { meta: { $ref: getSchemaPath(PaginationMetaDoc) } }
            : {}),
        },
      },
    }),
  );
}

/**
 * Documents an error response produced by the AllExceptionsFilter:
 * `{ success: false, message, errors? }`.
 *
 * @example
 * @ApiError(409, 'Email or username already taken')
 */
export function ApiError(status: number, description: string) {
  return ApiResponse({ status, description, type: ApiErrorDoc });
}
