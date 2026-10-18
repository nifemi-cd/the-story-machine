import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

/**
 * Body of PATCH /api/v1/user/:id. Same rules as sign-up, but every field
 * is optional so clients send only what changes.
 *
 * Email and password changes need their own flows (re-verification and
 * hashing), so they can't be set through a general profile update.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'password'] as const),
) {}
