import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type QueryFilter } from 'mongoose';
import { AppException } from '../common/exceptions/app.exception.js';
import type { PaginatedResult } from '../common/interfaces/api-response.interface.js';
import { User } from '../user/entities/user.entity.js';
import { Chapter } from '../chapter/entities/chapter.entity.js';
import { StorageService } from '../storage/storage.service.js';
import type { CharacterDto } from './dto/character.dto.js';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { ListStoriesQueryDto } from './dto/list-stories-query.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import {
  Story,
  type Character,
  type StoryDocument,
} from './entities/story.entity.js';
import { StoryStatus } from './enums/story-status.enum.js';

/**
 * Business logic for stories: creating, listing, lookup, updates and
 * deleting, plus keeping each story's chapterOrder in step with its chapters
 * and storing its draft file in Azure Blob Storage.
 */
@Injectable()
export class StoryService {
  constructor(
    @InjectModel(Story.name) private readonly storyModel: Model<Story>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
    private readonly storage: StorageService,
  ) {}

  /**
   * Creates a draft story with no chapters.
   *
   * @throws AppException 400 if authorId doesn't belong to a user
   */
  async create(createStoryDto: CreateStoryDto): Promise<StoryDocument> {
    // MongoDB doesn't enforce references, so check the author exists ourselves
    await this.authorExist(createStoryDto.authorId);

    const { characters, ...fields } = createStoryDto;
    return await this.storyModel.create({
      ...fields,
      ...(characters && { characters: toCharacters(characters) }),
    });
  }

  /**
   * Returns one page of stories, newest first, optionally only one author's
   * or only those with a given status.
   */
  async findAll({
    page,
    limit,
    authorId,
    status,
  }: ListStoriesQueryDto): Promise<PaginatedResult<StoryDocument>> {
    const filter: QueryFilter<Story> = {};
    if (authorId) filter.authorId = new Types.ObjectId(authorId);
    if (status) filter.status = status;

    // Fetch the page and count all matches at the same time
    const [items, total] = await Promise.all([
      this.storyModel
        .find(filter)
        // _id breaks ties so pages never overlap or skip stories
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.storyModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Returns a single story by id.
   *
   * @throws AppException 404 if no story has this id
   */
  async findOne(id: Types.ObjectId) {
    return await this.findStoryById(id);
  }

  /**
   * Returns a story together with its author's username, for the reader
   * payload, which shows the author by name.
   *
   * @throws AppException 404 if no story has this id
   */
  async findWithAuthorName(
    id: Types.ObjectId,
  ): Promise<{ story: StoryDocument; author: string }> {
    const story = await this.findStoryById(id);
    const user = await this.userModel
      .findById(story.authorId)
      .select('username')
      .exec();
    // Users can't be deleted yet, so a missing author shouldn't happen
    return { story, author: user?.username ?? '' };
  }

  /**
   * Updates only the fields sent (PATCH) and returns the updated story.
   * Changing the status also sets publishedAt: now when published, null
   * when moved back to draft. Characters, when sent, replace the whole list.
   *
   * @throws AppException 404 if no story has this id
   */
  async update(
    id: Types.ObjectId,
    updateStoryDto: UpdateStoryDto,
  ): Promise<StoryDocument> {
    const { characters, status, ...fields } = updateStoryDto;
    const changes: Record<string, unknown> = withoutUndefined(fields);
    if (characters) changes.characters = toCharacters(characters);

    // Only touch publishedAt when the status actually changes
    if (status) {
      const story = await this.findStoryById(id);
      if (story.status !== status) {
        changes.status = status;
        changes.publishedAt =
          status === StoryStatus.Published ? new Date() : null;
      }
    }

    const story = await this.storyModel
      .findByIdAndUpdate(id, changes, {
        // Return the story after the change, not before
        returnDocument: 'after',
        // Apply schema rules (e.g. title max length) to updates too
        runValidators: true,
      })
      .exec();
    if (!story) {
      throw AppException.notfound('Story not found');
    }
    return story;
  }

  /**
   * Deletes the story, all of its chapters and its draft file, for good.
   *
   * The story goes first: if deleting the rest then fails, it's left
   * behind unlisted, rather than a story listing chapters that are gone.
   *
   * @throws AppException 404 if no story has this id
   */
  async remove(id: Types.ObjectId): Promise<void> {
    const story = await this.storyModel.findByIdAndDelete(id).exec();
    if (!story) {
      throw AppException.notfound('Story not found');
    }
    await this.chapterModel.deleteMany({ storyId: id }).exec();
    await this.storage.delete(draftFileName(id));
  }

  /**
   * Saves a plain text file as the story's draft, replacing any earlier one,
   * and returns the story with draftUrl set.
   *
   * @throws AppException 400 if no file was sent or it isn't plain text
   * @throws AppException 404 if no story has this id
   */
  async uploadFile(
    id: Types.ObjectId,
    file?: Express.Multer.File,
  ): Promise<StoryDocument> {
    if (!file || file.mimetype !== 'text/plain') {
      throw AppException.badRequest('A .txt file is required', [
        {
          field: 'file',
          message: 'file must be a plain text (.txt) file',
          success: false,
        },
      ]);
    }
    // Check first, so no file is stored for a story that doesn't exist
    await this.findStoryById(id);

    const url = await this.storage.upload(
      draftFileName(id),
      file.buffer,
      'text/plain; charset=utf-8',
    );
    const story = await this.storyModel
      .findByIdAndUpdate(id, { draftUrl: url }, { returnDocument: 'after' })
      .exec();
    // Deleted while the file was uploading
    if (!story) {
      throw AppException.notfound('Story not found');
    }
    return story;
  }

  /**
   * Returns the contents of the story's draft file.
   *
   * @throws AppException 404 if no story has this id, or it has no file yet
   */
  async getFile(id: Types.ObjectId): Promise<Buffer> {
    const story = await this.findStoryById(id);
    if (!story.draftUrl) {
      throw AppException.notfound('This story has no file yet');
    }
    return await this.storage.download(draftFileName(id));
  }

  /**
   * Fails unless the story exists. Used by chapter routes before listing.
   *
   * @throws AppException 404 if no story has this id
   */
  async ensureExists(id: Types.ObjectId): Promise<void> {
    if (!(await this.storyModel.exists({ _id: id }))) {
      throw AppException.notfound('Story not found');
    }
  }

  /**
   * Adds a chapter to the end of the story's chapterOrder and returns its
   * position (0-based). Done in one atomic update so two chapters added at
   * the same time can't get the same position.
   *
   * @throws AppException 404 if no story has this id
   */
  async addChapter(
    storyId: Types.ObjectId,
    chapterId: Types.ObjectId,
    title: string,
  ): Promise<number> {
    const story = await this.storyModel
      .findByIdAndUpdate(
        storyId,
        { $push: { chapterOrder: { chapterId, title } } },
        { returnDocument: 'after', projection: { chapterOrder: 1 } },
      )
      .exec();
    if (!story) {
      throw AppException.notfound('Story not found');
    }
    return story.chapterOrder.findIndex((ref) =>
      ref.chapterId.equals(chapterId),
    );
  }

  /** Updates the chapter's title in the story's chapterOrder. */
  async renameChapter(
    storyId: Types.ObjectId,
    chapterId: Types.ObjectId,
    title: string,
  ): Promise<void> {
    await this.storyModel
      .updateOne(
        { _id: storyId, 'chapterOrder.chapterId': chapterId },
        // $ is the chapterOrder entry matched by the filter
        { $set: { 'chapterOrder.$.title': title } },
      )
      .exec();
  }

  /** Removes the chapter from the story's chapterOrder. */
  async removeChapter(
    storyId: Types.ObjectId,
    chapterId: Types.ObjectId,
  ): Promise<void> {
    await this.storyModel
      .updateOne({ _id: storyId }, { $pull: { chapterOrder: { chapterId } } })
      .exec();
  }

  /**
   * Loads a story or fails with a 404, so callers don't have to check for null.
   *
   * @throws AppException 404 if no story has this id
   */
  private async findStoryById(id: Types.ObjectId): Promise<StoryDocument> {
    const story = await this.storyModel.findById(id).exec();
    if (!story) {
      throw AppException.notfound('Story not found');
    }
    return story;
  }

  /**
   * Fails if no user has this id.
   *
   * @throws AppException 400 naming the authorId field
   */
  private async authorExist(authorId: string) {
    if (!(await this.userModel.exists({ _id: authorId }))) {
      throw AppException.badRequest('Author not found', [
        {
          field: 'authorId',
          message: 'authorId must belong to an existing user',
          success: false,
        },
      ]);
    }
  }
}

/**
 * Turns the characters from a request into what's stored: unsent optional
 * fields become null, and every character gets a "default" emotion (first)
 * for dialogue lines that don't pick a portrait.
 */
function toCharacters(characters: CharacterDto[]): Character[] {
  return characters.map(({ name, description, emotions = [] }) => {
    const names = emotions.map((e) => e.emotion);
    if (!names.includes('default')) names.unshift('default');
    return {
      name,
      description: description ?? null,
      emotions: names.map((emotion) => ({
        emotion,
        portrait_x: null,
        portrait_y: null,
      })),
    };
  });
}

/** Where a story's draft file is kept in the storage container. */
function draftFileName(id: Types.ObjectId): string {
  return `drafts/${id.toString()}.txt`;
}

/** Drops keys whose value is undefined, so a PATCH only sets what was sent. */
function withoutUndefined(object: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}
