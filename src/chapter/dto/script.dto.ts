import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// These classes check the shape of a script sent by the frontend's parser.
// Rules that need the whole script or the story (exactly one kind per line,
// jumps that land on real lines, known characters) are in check-script.ts.
// They also describe the script in the Swagger docs.

/** `text` of a dialogue or prose line. */
export class ScriptTextDto {
  @ApiProperty({ type: [String], example: ['We', 'made', 'it.'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  words: string[];
}

/** A `dialogue` line. */
export class DialogueLineDto {
  @ApiProperty({ description: 'One of the story characters', example: 'Dave' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'One of that character\'s emotions; "default" if left out',
    example: 'happy',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  portrait?: string;

  @ApiProperty({ type: ScriptTextDto })
  @ValidateNested()
  @Type(() => ScriptTextDto)
  text: ScriptTextDto;

  @ApiPropertyOptional({
    description: 'Not used yet; must be null',
    type: String,
    nullable: true,
    example: null,
  })
  // IsOptional lets null and undefined through, so anything else fails Equals
  @IsOptional()
  @Equals(null)
  text_color?: null;
}

/** A `prose` line. */
export class ProseLineDto {
  @ApiProperty({ type: ScriptTextDto })
  @ValidateNested()
  @Type(() => ScriptTextDto)
  text: ScriptTextDto;

  @ApiPropertyOptional({
    description: 'Not used yet; must be null',
    type: String,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @Equals(null)
  text_color?: null;
}

/** One option of a `choice` line. */
export class ChoiceOptionDto {
  @ApiProperty({ description: 'line_id to jump to', example: 8 })
  @IsInt()
  @Min(0)
  goto_line: number;

  @ApiProperty({ example: 'Open the door', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  option_body: string;

  @ApiPropertyOptional({
    description: 'Not used yet; must be null',
    // Swagger can't infer a type from `null`, so name one
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @Equals(null)
  condition?: null;
}

/**
 * One entry in `lines`. Exactly one of the optional fields must be set.
 */
export class ScriptLineDto {
  @ApiProperty({ description: 'Position in lines, from 0', example: 0 })
  @IsInt()
  @Min(0)
  line_id: number;

  @ApiPropertyOptional({ type: DialogueLineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DialogueLineDto)
  dialogue?: DialogueLineDto;

  @ApiPropertyOptional({ type: ProseLineDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProseLineDto)
  prose?: ProseLineDto;

  @ApiPropertyOptional({ type: [ChoiceOptionDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChoiceOptionDto)
  choice?: ChoiceOptionDto[];

  @ApiPropertyOptional({
    description: 'Image to switch the background to',
    example: 'cabin-door.jpg',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  background?: string;

  @ApiPropertyOptional({ description: 'line_id to jump to', example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  goto_line?: number;

  @ApiPropertyOptional({ description: 'Always true when set', example: true })
  @IsOptional()
  @Equals(true)
  end?: true;
}

/**
 * Body of PUT /api/v1/story/:storyId/chapter/:id/script: the `story` object
 * of the story JSON contract, as the frontend's parser produces it.
 */
export class ScriptDto {
  @ApiPropertyOptional({
    description: 'Bookmarks: flag name to the line it marks',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: { line_id: { type: 'integer', example: 15 } },
      required: ['line_id'],
    },
    example: { Morning: { line_id: 15 } },
  })
  // Keys are free-form, so each entry is checked in check-script.ts
  @IsOptional()
  @IsObject()
  flags?: Record<string, { line_id: number }>;

  @ApiPropertyOptional({
    description: 'Not used yet; must be empty',
    type: 'array',
    items: {},
    example: [],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(0)
  variables?: [];

  @ApiProperty({ type: [ScriptLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => ScriptLineDto)
  lines: ScriptLineDto[];
}
