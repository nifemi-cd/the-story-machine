import {
  Injectable,
  StreamableFile,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import type {
  ApiSuccessResponse,
  PaginatedResult,
} from '../interfaces/api-response.interface.js';

// Used when a route has no @ResponseMessage
const DEFAULT_MESSAGE = 'Success';

/** True when a service returned `{ items, meta }` from a paginated list. */
function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PaginatedResult<unknown>).items) &&
    typeof (value as PaginatedResult<unknown>).meta === 'object'
  );
}

/**
 * Wraps whatever a controller returns in `{ success: true, message, data }`,
 * so controllers just return the data.
 *
 * For paginated results, the items become `data` and the pagination
 * details move to a top-level `meta` field. Files (StreamableFile) are
 * sent as they are, since wrapping them in JSON would break the download.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  /** Called by Nest around every route handler. */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only HTTP responses are wrapped
    if (context.getType() !== 'http') {
      return next.handle();
    }

    // A message on the method wins over one on the controller class
    const message =
      this.reflector.getAllAndOverride<string | undefined>(
        RESPONSE_MESSAGE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? DEFAULT_MESSAGE;

    return next
      .handle()
      .pipe(
        map((data: unknown): ApiSuccessResponse<unknown> | StreamableFile =>
          data instanceof StreamableFile
            ? data
            : isPaginatedResult(data)
              ? { success: true, message, data: data.items, meta: data.meta }
              : { success: true, message, data: data ?? null },
        ),
      );
  }
}
