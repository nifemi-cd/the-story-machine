import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { UserRole } from '../enums/user-role.enum.js';

/**
 * A user account as stored in the "users" collection. The same account
 * can read and write stories; `roles` only controls admin powers.
 * `timestamps: true` makes Mongoose fill in createdAt and updatedAt.
 */
@Schema({ timestamps: true })
export class User {
  // Stored lowercased, so "Ada@Example.com" and "ada@example.com" are the same account
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  // Uniqueness is case-insensitive via the collation index below
  @Prop({ required: true, trim: true })
  username: string;

  // Never returned by default; use .select('+passwordHash') when verifying logins
  @Prop({ required: true, select: false })
  passwordHash: string;

  // Bump to invalidate all sessions
  @Prop({ default: 0 })
  tokenVersion: number;

  // Name shown on profiles; defaults to the username at sign-up
  @Prop({ trim: true })
  displayName: string;

  // Never set from requests; admins are promoted outside the public API
  @Prop({ type: [String], enum: UserRole, default: [UserRole.User] })
  roles: UserRole[];

  @Prop({ maxlength: 500, default: '' })
  bio: string;

  @Prop({ default: '' })
  profileUrl: string;

  // Cached counts, so profiles don't have to count follow records (follows aren't built yet)
  @Prop({ default: 0, min: 0 })
  followerCount: number;

  @Prop({ default: 0, min: 0 })
  followingCount: number;

  // Filled in by Mongoose because of timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

// A User loaded from the database, with Mongoose methods like .save()
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

// Case-insensitive comparison; queries by username must use the same collation
export const USERNAME_COLLATION = { locale: 'en', strength: 2 };

// Unique ignoring case, so "Ada" and "ada" can't both be registered
UserSchema.index(
  { username: 1 },
  { unique: true, collation: USERNAME_COLLATION },
);

// select: false doesn't apply to documents returned by create(), so strip the
// hash and session data whenever a user is serialized into a response
UserSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    const {
      passwordHash: _passwordHash,
      tokenVersion: _tokenVersion,
      ...safe
    } = ret;
    return safe;
  },
});
