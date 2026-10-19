import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  ApiErrorResponse,
  FieldError,
  PaginationMeta,
} from '../interfaces/api-response.interface.js';

// Swagger can't read TypeScript interfaces, so these classes describe the
// shared response shapes for the docs. They mirror api-response.interface.ts.

/** Pagination details on list responses. */
export class PaginationMetaDoc implements PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ description: 'Items across all pages', example: 45 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

/** One problem with the request. */
export class FieldErrorDoc implements FieldError {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiPropertyOptional({
    description: 'The request field that failed; dotted for nested fields',
    example: 'email',
  })
  field?: string;

  @ApiProperty({ example: 'email must be an email' })
  message: string;
}

/** Body of every error response. */
export class ApiErrorDoc implements ApiErrorResponse {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({
    description: 'Only present when specific fields were wrong',
    type: [FieldErrorDoc],
  })
  errors?: FieldErrorDoc[];
}
