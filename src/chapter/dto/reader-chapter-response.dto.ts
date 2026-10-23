import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { CharacterResponseDto } from '../../story/dto/story-response.dto.js';
import { ScriptDto } from './script.dto.js';

/**
 * A chapter as the reader plays it, for the Swagger docs. This is the agreed
 * story JSON contract, so its fields are snake_case.
 */
@ApiExtraModels(CharacterResponseDto)
export class ReaderChapterResponseDto {
  @ApiProperty({ example: 'The Lion at the Door' })
  title: string;

  @ApiProperty({ description: "The author's username", example: 'mock-author' })
  author: string;

  @ApiProperty({ example: '6650f1c2a1b2c3d4e5f60718' })
  story_id: string;

  @ApiProperty({ example: '6650f1c2a1b2c3d4e5f60719' })
  chapter_id: string;

  @ApiProperty({ example: 'Chapter 1' })
  chapter_name: string;

  @ApiProperty({
    description: "The story's characters, keyed by name",
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(CharacterResponseDto) },
  })
  characters: Record<string, CharacterResponseDto>;

  @ApiProperty({
    description:
      'The chapter script. Empty (no lines) until one has been saved.',
    type: ScriptDto,
  })
  story: ScriptDto;
}
