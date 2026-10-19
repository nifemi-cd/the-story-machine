import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Stops clients requesting huge pages that would slow the database down
export const MAX_PAGE_SIZE = 100;

/**
 * Query parameters for any paginated list, e.g. `?page=2&limit=20`.
 * Both are optional and default to page 1 with 20 items.
 */
export class PaginationQueryDto {
  // Query strings arrive as text, so @Type converts them to numbers first
  @ApiPropertyOptional({
    description: 'Page number, starting at 1',
    default: 1,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = 20;
}
