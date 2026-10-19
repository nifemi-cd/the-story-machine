import { Injectable, type PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';
import { AppException } from '../exceptions/app.exception.js';

// Types.ObjectId.isValid() also accepts any 12-character string, so require
// the 24-character hex form that clients actually send
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

/**
 * Turns an `:id` route parameter into a MongoDB ObjectId, or rejects the
 * request with a 400 if it isn't a valid id.
 *
 * Without it, a bad id like "/user/123" would reach the database and fail
 * there with a 500.
 *
 * @example
 * findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId)
 */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<
  string,
  Types.ObjectId
> {
  transform(value: string): Types.ObjectId {
    if (!OBJECT_ID_PATTERN.test(value)) {
      throw AppException.badRequest('Invalid id', [
        {
          field: 'id',
          message: 'id must be a 24-character hex string',
          success: false,
        },
      ]);
    }
    return new Types.ObjectId(value);
  }
}
