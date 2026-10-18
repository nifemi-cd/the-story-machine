import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { AppException } from '../common/exceptions/app.exception.js';
import type { PaginatedResult } from '../common/interfaces/api-response.interface.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import {
  User,
  USERNAME_COLLATION,
  type UserDocument,
} from './entities/user.entity.js';

// bcrypt cost factor: higher is slower to hash and harder to brute-force
const SALT_ROUNDS = 12;

// MongoDB's duplicate key error code
const DUPLICATE_KEY = 11000;

/** True when MongoDB rejected a write because a unique index was violated. */
function isDuplicateKeyError(
  error: unknown,
): error is { code: number; keyPattern?: Record<string, unknown> } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === DUPLICATE_KEY
  );
}

/** Business logic for user accounts: sign-up, listing, lookup and profile updates. */
@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Registers a new user. The password is hashed and never stored as plain text.
   * The display name defaults to the username when not given.
   *
   * @throws AppException 409 if the email or username is already taken
   */
  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // email and username arrive trimmed (and email lowercased) from the DTO
    const { password, ...profile } = createUserDto;

    // Check if username or email exist
    await this.userNameOrEmailExist(profile.email, profile.username);

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    try {
      // create user
      return await this.userModel.create({
        ...profile,
        displayName: profile.displayName ?? profile.username,
        passwordHash,
      });
    } catch (error) {
      // Another request claimed the email or username after our check
      if (isDuplicateKeyError(error)) {
        throw AppException.conflict(
          'Oppsss!! Email or Username has been taken',
        );
      }
      throw error;
    }
  }

  /**
   * Returns one page of users, newest first, plus the total count so
   * clients can show page numbers.
   */
  async findAll({
    page,
    limit,
  }: PaginationQueryDto): Promise<PaginatedResult<UserDocument>> {
    // Fetch the page and count all users at the same time
    const [items, total] = await Promise.all([
      this.userModel
        .find()
        // _id breaks ties so pages never overlap or skip users
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Returns a single user by id.
   *
   * @throws AppException 404 if no user has this id
   */
  async findOne(id: Types.ObjectId) {
    return await this.findUserById(id);
  }

  /**
   * Updates only the fields sent (PATCH) and returns the updated user.
   * Email and password can't be changed here because UpdateUserDto leaves them out.
   *
   * @throws AppException 409 if the new username belongs to another user
   * @throws AppException 404 if no user has this id
   */
  async update(
    id: Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    // Only check the username when it's being changed
    if (updateUserDto.username) {
      await this.userNameExist(updateUserDto.username, id);
    }

    try {
      const user = await this.userModel
        .findByIdAndUpdate(id, updateUserDto, {
          // Return the user after the change, not before
          returnDocument: 'after',
          // Apply schema rules (e.g. bio max length) to updates too
          runValidators: true,
        })
        .exec();
      if (!user) {
        throw AppException.notfound('User not found');
      }
      return user;
    } catch (error) {
      // Another request took the username after our check
      if (isDuplicateKeyError(error)) {
        throw AppException.conflict('Username has been taken');
      }
      throw error;
    }
  }

  /**
   * Loads a user or fails with a 404, so callers don't have to check for null.
   *
   * @throws AppException 404 if no user has this id
   */
  private async findUserById(id: Types.ObjectId) {
    const user: User | null = await this.userModel.findById(id);
    if (!user) {
      throw AppException.notfound('User not found');
    }
    return user;
  }

  /**
   * Fails if another user already has this username, ignoring letter case.
   * The user being updated is excluded, so they can change the case of their
   * own username (e.g. reader_1 → Reader_1).
   *
   * @throws AppException 409 if the username is taken
   */
  private async userNameExist(username: string, id: Types.ObjectId) {
    const taken = await this.userModel
      .exists({ username, _id: { $ne: id } })
      .collation(USERNAME_COLLATION);
    if (taken) {
      throw AppException.conflict('Username has been taken');
    }
  }

  /**
   * Fails if the email or username is already registered. Usernames are
   * compared ignoring letter case.
   *
   * @throws AppException 409 if either is taken
   */
  private async userNameOrEmailExist(email: string, username: string) {
    // Run both lookups at the same time
    const [emailTaken, usernameTaken] = await Promise.all([
      this.userModel.exists({ email }),
      this.userModel.exists({ username }).collation(USERNAME_COLLATION),
    ]);

    if (emailTaken || usernameTaken) {
      throw AppException.conflict('Oppsss!! Email or Username has been taken');
    }
  }
}
