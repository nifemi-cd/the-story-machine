import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StoryStatus } from '../enums/story-status.enum.js';
import { CreateStoryDto } from './create-story.dto.js';

/**
 * Body of PATCH /api/v1/story/:id. Same rules as creating a story, but every
 * field is optional so clients send only what changes.
 *
 * The author can't be changed. Sending a status publishes or unpublishes the
 * story, and the server sets publishedAt to match.
 */
export class UpdateStoryDto extends PartialType(
  OmitType(CreateStoryDto, ['authorId'] as const),
) {
  @ApiPropertyOptional({ enum: StoryStatus, enumName: 'StoryStatus' })
  @IsOptional()
  @IsEnum(StoryStatus)
  status?: StoryStatus;
}
