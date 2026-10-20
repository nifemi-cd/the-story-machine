import { PartialType } from '@nestjs/swagger';
import { CreateChapterDto } from './create-chapter.dto.js';

/**
 * Body of PATCH /api/v1/story/:storyId/chapter/:id. Same rules as creating a
 * chapter, but every field is optional so clients send only what changes.
 *
 * Order and contents can't be set here; they'll get their own flows
 * (reordering and the parser).
 */
export class UpdateChapterDto extends PartialType(CreateChapterDto) {}
