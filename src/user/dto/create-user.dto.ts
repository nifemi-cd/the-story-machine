import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

// Trim before validation so " a@b.com " is accepted rather than rejected
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Body of POST /api/v1/user (sign-up). Any field not listed here is
 * rejected, so clients can't set things like `roles` themselves.
 *
 * @ApiProperty decorators only feed the Swagger docs at /api/docs; the
 * class-validator decorators below them do the actual validation.
 */
export class CreateUserDto {
  // Lowercased so the same address can't register twice with different casing
  @ApiProperty({
    description: 'Trimmed and lowercased before saving',
    example: 'ada.reader@example.com',
    format: 'email',
    maxLength: 254,
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  // Letters, numbers and underscores only
  @ApiProperty({
    description:
      'Letters, numbers and underscores. Must be unique, ignoring letter case.',
    example: 'ada_writes',
    pattern: '^[a-zA-Z0-9_]{3,30}$',
    minLength: 3,
    maxLength: 30,
  })
  @Transform(trim)
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message:
      'username must be 3-30 characters and contain only letters, numbers and underscores',
  })
  username: string;

  // Plain-text password; the service hashes it into passwordHash.
  // Must have 8+ characters with an uppercase, lowercase, number and symbol.
  @ApiProperty({
    description:
      'At least 8 characters (max 72 bytes) with an uppercase letter, a lowercase letter, a number and a symbol. Never returned.',
    example: 'Story!Time2026',
    format: 'password',
    minLength: 8,
  })
  @IsString()
  @IsStrongPassword({
    minLength: 8,
    minNumbers: 1,
    minLowercase: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  // bcrypt ignores everything after 72 bytes (not characters)
  @IsByteLength(0, 72, { message: 'password must be at most 72 bytes' })
  password: string;

  // Defaults to the username when not given
  @ApiPropertyOptional({
    description: 'Name shown on profiles. Defaults to the username.',
    example: 'Ada Lovelace',
    maxLength: 50,
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  displayName?: string;

  // Short "about me" text; can be empty
  @ApiPropertyOptional({
    description: 'Short "about me" text',
    example: 'I read mysteries and write branching sci-fi.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  // Link to the user's own site or social profile (http/https)
  @ApiPropertyOptional({
    description: "Link to the user's own site or social profile",
    example: 'https://example.com/ada',
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  profileUrl?: string;
}
