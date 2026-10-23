import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateChapterDto } from './create-chapter.dto.js';

/**
 * Body of PATCH /api/v1/story/:storyId/chapter/:id. Same rules as creating a
 * chapter, but every field is optional so clients send only what changes.
 *
 * The story (script) can't be set here: it's replaced through
 * PUT .../script. Reordering will get its own flow.
 */
export class UpdateChapterDto extends PartialType(
  OmitType(CreateChapterDto, ['story'] as const),
) {}
