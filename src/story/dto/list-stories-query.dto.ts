import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { StoryStatus } from '../enums/story-status.enum.js';

/**
 * Query parameters for GET /api/v1/story, e.g.
 * `?status=published&page=2` for the reader feed or `?authorId=...` for
 * one author's stories.
 */
export class ListStoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Only this user's stories",
    example: '6ad4306d3168a59d2918aead',
  })
  @IsOptional()
  @IsMongoId()
  authorId?: string;

  @ApiPropertyOptional({ enum: StoryStatus, enumName: 'StoryStatus' })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;
}
