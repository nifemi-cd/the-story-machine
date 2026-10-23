import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppException } from '../common/exceptions/app.exception.js';
import type { StoryDocument } from '../story/entities/story.entity.js';
import { StoryService } from '../story/story.service.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ScriptDto } from './dto/script.dto.js';
import { checkScript, toStoredScript } from './check-script.js';
import { Chapter, type ChapterDocument } from './entities/chapter.entity.js';

/** A chapter in the story JSON contract shape, as every chapter route returns it. */
export interface ChapterView {
  title: string;
  author: string;
  story_id: string;
  chapter_id: string;
  chapter_name: string;
  characters: Record<string, unknown>;
  story: unknown;
}

/** A chapter in a story's chapter list: the contract shape without the script or cast. */
export type ChapterSummary = Omit<ChapterView, 'characters' | 'story'>;

/**
 * Business logic for a story's chapters: adding, listing, lookup, updates,
 * deleting and saving scripts. Every lookup is scoped to the story in the
 * URL, so a chapter id from another story is a 404.
 *
 * Chapters are returned in the story JSON contract shape, with the parent
 * story's title, author and characters around the chapter. In the database
 * the chapter's name is `title` and its story is `script`; only the API
 * uses the contract's names.
 */
@Injectable()
export class ChapterService {
  constructor(
    @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
    private readonly storyService: StoryService,
  ) {}

  /**
   * Adds a chapter to the end of the story, with its script if one is sent.
   *
   * The story's chapterOrder is updated first (that's where the position
   * comes from), then the chapter is saved. If saving fails, the entry is
   * taken back out so the story never lists a chapter that doesn't exist.
   *
   * @throws AppException 400 listing every problem if the script is invalid
   * @throws AppException 404 if the story doesn't exist
   */
  async create(
    storyId: Types.ObjectId,
    { chapter_name, story: script }: CreateChapterDto,
  ): Promise<ChapterView> {
    const { story, author } =
      await this.storyService.findWithAuthorName(storyId);
    // The script sits under `story` in this body, so its error paths do too
    if (script) this.assertValidScript(script, story, 'story.');

    // Chosen up front so the story can list the chapter before it's saved
    const _id = new Types.ObjectId();
    const order = await this.storyService.addChapter(
      storyId,
      _id,
      chapter_name,
    );

    try {
      const chapter = await this.chapterModel.create({
        _id,
        storyId,
        order,
        title: chapter_name,
        script: script ? toStoredScript(script) : null,
      });
      return toView(chapter, story, author);
    } catch (error) {
      await this.storyService.removeChapter(storyId, _id);
      throw error;
    }
  }

  /**
   * Returns all of the story's chapters in reading order, without their
   * scripts or the story's characters (load a single chapter for those).
   *
   * @throws AppException 404 if the story doesn't exist
   */
  async findAll(storyId: Types.ObjectId): Promise<ChapterSummary[]> {
    const { story, author } =
      await this.storyService.findWithAuthorName(storyId);

    const chapters = await this.chapterModel
      .find({ storyId })
      .select('-script')
      .sort({ order: 1 })
      .exec();
    return chapters.map((chapter) => toSummary(chapter, story, author));
  }

  /**
   * Returns a single chapter of the story with its script: everything the
   * reader needs to play it.
   *
   * @throws AppException 404 if the story, or its chapter with this id, doesn't exist
   */
  async findOne(
    storyId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<ChapterView> {
    const [chapter, { story, author }] = await Promise.all([
      this.findChapter(storyId, id),
      this.storyService.findWithAuthorName(storyId),
    ]);
    return toView(chapter, story, author);
  }

  /**
   * Updates only the fields sent (PATCH) and returns the updated chapter.
   * A new chapter_name is copied into the story's chapterOrder too.
   *
   * @throws AppException 404 if the story, or its chapter with this id, doesn't exist
   */
  async update(
    storyId: Types.ObjectId,
    id: Types.ObjectId,
    { chapter_name }: UpdateChapterDto,
  ): Promise<ChapterView> {
    const { story, author } =
      await this.storyService.findWithAuthorName(storyId);

    const chapter = await this.chapterModel
      .findOneAndUpdate(
        { _id: id, storyId },
        // Stored as `title`; an empty change when chapter_name isn't sent
        chapter_name === undefined ? {} : { title: chapter_name },
        {
          // Return the chapter after the change, not before
          returnDocument: 'after',
          // Apply schema rules (e.g. title max length) to updates too
          runValidators: true,
        },
      )
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }

    if (chapter_name) {
      await this.storyService.renameChapter(storyId, id, chapter.title);
    }
    return toView(chapter, story, author);
  }

  /**
   * Deletes the chapter for good and takes it out of the story's
   * chapterOrder. Later chapters move up one place, so each chapter's order
   * still matches its position in chapterOrder.
   *
   * @throws AppException 404 if the story has no chapter with this id
   */
  async remove(storyId: Types.ObjectId, id: Types.ObjectId): Promise<void> {
    const chapter = await this.chapterModel
      .findOneAndDelete({ _id: id, storyId })
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }

    await this.storyService.removeChapter(storyId, id);
    await this.chapterModel
      .updateMany(
        { storyId, order: { $gt: chapter.order } },
        { $inc: { order: -1 } },
      )
      .exec();
  }

  /**
   * Replaces the chapter's script with one parsed by the frontend, after
   * checking it against the story (see check-script.ts).
   *
   * @throws AppException 400 listing every problem if the script is invalid
   * @throws AppException 404 if the story, or its chapter with this id, doesn't exist
   */
  async saveScript(
    storyId: Types.ObjectId,
    id: Types.ObjectId,
    scriptDto: ScriptDto,
  ): Promise<ChapterView> {
    // Dialogue is checked against the story's characters
    const { story, author } =
      await this.storyService.findWithAuthorName(storyId);
    this.assertValidScript(scriptDto, story);

    const chapter = await this.chapterModel
      .findOneAndUpdate(
        { _id: id, storyId },
        { script: toStoredScript(scriptDto) },
        { returnDocument: 'after', runValidators: true },
      )
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }
    return toView(chapter, story, author);
  }

  /**
   * Loads a chapter of the story or fails with a 404, so callers don't have
   * to check for null.
   *
   * @throws AppException 404 if the story has no chapter with this id
   */
  private async findChapter(
    storyId: Types.ObjectId,
    id: Types.ObjectId,
  ): Promise<ChapterDocument> {
    const chapter = await this.chapterModel
      .findOne({ _id: id, storyId })
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }
    return chapter;
  }

  /**
   * Fails unless the script passes the checks in check-script.ts.
   *
   * @param prefix put before each error's field, for scripts nested in a body
   * @throws AppException 400 listing every problem
   */
  private assertValidScript(
    script: ScriptDto,
    story: StoryDocument,
    prefix = '',
  ): void {
    const errors = checkScript(script, story.characters);
    if (errors.length) {
      throw AppException.validation(
        errors.map((e) => ({ ...e, field: `${prefix}${e.field}` })),
        'Script is invalid',
      );
    }
  }
}

/** The contract fields every chapter response has, whether listed or loaded alone. */
function toSummary(
  chapter: ChapterDocument,
  story: StoryDocument,
  author: string,
): ChapterSummary {
  return {
    title: story.title,
    author,
    story_id: story._id.toString(),
    chapter_id: chapter._id.toString(),
    chapter_name: chapter.title,
  };
}

/**
 * The full contract shape: the summary plus the story's characters and the
 * chapter's script. A chapter without a script yet gets an empty one,
 * which the reader shows as the ending screen.
 */
function toView(
  chapter: ChapterDocument,
  story: StoryDocument,
  author: string,
): ChapterView {
  // toJSON turns the flags Map into a plain object
  const { script } = chapter.toJSON();
  return {
    ...toSummary(chapter, story, author),
    // The contract keys characters by name
    characters: Object.fromEntries(
      story.toJSON().characters.map((c) => [c.name, c]),
    ),
    story: script ?? { flags: {}, variables: [], lines: [] },
  };
}
