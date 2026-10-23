import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ScriptDto } from './script.dto.js';

/**
 * Body of POST /api/v1/story/:storyId/chapter, using the story JSON
 * contract's field names. The new chapter is added to the end of the story.
 *
 * The contract's other fields come from the server: story_id from the URL,
 * chapter_id is generated, and title and author from the parent story.
 */
export class CreateChapterDto {
  @ApiProperty({ example: 'Chapter 1', maxLength: 120 })
  // Trim before validation so "  " counts as empty
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  chapter_name: string;

  @ApiPropertyOptional({
    description:
      "The chapter's parsed script. Checked the same way as PUT .../script; can be left out and saved later.",
    type: ScriptDto,
  })
  @IsOptional()
  // Turns the plain object into a ScriptDto so its own rules run
  @ValidateNested()
  @Type(() => ScriptDto)
  story?: ScriptDto;
}
