import { PartialType } from '@nestjs/swagger';
import { CreateChapterDto } from './create-chapter.dto.js';

/**
 * Body of PATCH /api/v1/story/:storyId/chapter/:id. Same rules as creating a
 * chapter, but every field is optional so clients send only what changes.
 *
 * Order and script can't be set here: the script is saved through
 * PUT .../script, and reordering will get its own flow.
 */
export class UpdateChapterDto extends PartialType(CreateChapterDto) {}
