import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CharacterDto } from './character.dto.js';

// Trim before validation so "  " counts as empty
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body of POST /api/v1/story. New stories always start as drafts with no
 * chapters; chapters are added through /story/:storyId/chapter.
 */
export class CreateStoryDto {
  // Temporary: once login exists the author will be the logged-in user
  @ApiProperty({
    description:
      'Id of the user writing the story. Will come from the login session once auth exists.',
    example: '6ad4306d3168a59d2918aead',
  })
  @IsMongoId()
  authorId: string;

  @ApiProperty({ example: 'The Lighthouse Keeper', maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({
    description: 'Blurb shown on the story card',
    example: 'A storm, a stranger, and three doors you should not open.',
    maxLength: 2000,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description:
      'Everyone who speaks in the story. On PATCH the whole list is replaced.',
    type: [CharacterDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((character: CharacterDto) => character.name, {
    message: 'characters must have unique names',
  })
  // Turns each plain object into a CharacterDto so its own rules run
  @ValidateNested({ each: true })
  @Type(() => CharacterDto)
  characters?: CharacterDto[];
}
