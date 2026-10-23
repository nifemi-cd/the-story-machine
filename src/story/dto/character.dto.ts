import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// Trim before validation so "  " counts as empty
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * One emotion in a character's `emotions` list. Portrait positions come in a
 * later sprint, so they may be sent but must be null.
 */
export class EmotionDto {
  @ApiProperty({ example: 'angry', maxLength: 50 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  emotion: string;

  @ApiPropertyOptional({
    description: 'Not used yet; must be null',
    type: Number,
    nullable: true,
    example: null,
  })
  // IsOptional lets null and undefined through, so anything else fails Equals
  @IsOptional()
  @Equals(null)
  portrait_x?: null;

  @ApiPropertyOptional({
    description: 'Not used yet; must be null',
    type: Number,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @Equals(null)
  portrait_y?: null;
}

/**
 * One entry in the `characters` list of story requests. A "default"
 * emotion is added by the server if it isn't sent.
 */
export class CharacterDto {
  @ApiProperty({
    description: 'Unique within the story; dialogue lines use it as `name`',
    example: 'Dave',
    maxLength: 50,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
    maxLength: 500,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Emotion names must be unique; "default" is always added',
    type: [EmotionDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique((emotion: EmotionDto) => emotion.emotion, {
    message: 'emotions must have unique names',
  })
  // Turns each plain object into an EmotionDto so its own rules run
  @ValidateNested({ each: true })
  @Type(() => EmotionDto)
  emotions?: EmotionDto[];
}
