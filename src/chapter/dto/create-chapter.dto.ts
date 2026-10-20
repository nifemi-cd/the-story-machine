import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Body of POST /api/v1/story/:storyId/chapter. The new chapter is added to
 * the end of the story; its contents are filled in later by the parser.
 */
export class CreateChapterDto {
  @ApiProperty({ example: 'The Door in the Cellar', maxLength: 120 })
  // Trim before validation so "  " counts as empty
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;
}
