import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The `presentation` object in story requests. Every field is optional;
 * on PATCH only the fields sent are changed.
 */
export class PresentationDto {
  @ApiPropertyOptional({
    description: 'Font family readers see the story in',
    example: 'Georgia',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(100)
  font?: string;

  @ApiPropertyOptional({ description: 'Hex colour', example: '#1a1a1a' })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @ApiPropertyOptional({ description: 'Hex colour', example: '#fdf6e3' })
  @IsOptional()
  @IsHexColor()
  windowColor?: string;
}
