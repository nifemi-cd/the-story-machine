import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppException } from '../common/exceptions/app.exception.js';
import { StoryService } from '../story/story.service.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { Chapter, type ChapterDocument } from './entities/chapter.entity.js';

/**
 * Business logic for a story's chapters: adding, listing, lookup and
 * updates. Every lookup is scoped to the story in the URL, so a chapter id
 * from another story is a 404.
 */
@Injectable()
export class ChapterService {
  constructor(
    @InjectModel(Chapter.name) private readonly chapterModel: Model<Chapter>,
    private readonly storyService: StoryService,
  ) {}

  /**
   * Adds a chapter to the end of the story.
   *
   * The story's chapterOrder is updated first (that's where the position
   * comes from), then the chapter is saved. If saving fails, the entry is
   * taken back out so the story never lists a chapter that doesn't exist.
   *
   * @throws AppException 404 if the story doesn't exist
   */
  async create(
    storyId: Types.ObjectId,
    createChapterDto: CreateChapterDto,
  ): Promise<ChapterDocument> {
    // Chosen up front so the story can list the chapter before it's saved
    const _id = new Types.ObjectId();
    const order = await this.storyService.addChapter(
      storyId,
      _id,
      createChapterDto.title,
    );

    try {
      return await this.chapterModel.create({
        _id,
        storyId,
        order,
        ...createChapterDto,
      });
    } catch (error) {
      await this.storyService.removeChapter(storyId, _id);
      throw error;
    }
  }

  /**
   * Returns all of the story's chapters in reading order, without their
   * contents (load a single chapter for that).
   *
   * @throws AppException 404 if the story doesn't exist
   */
  async findAll(storyId: Types.ObjectId): Promise<ChapterDocument[]> {
    await this.storyService.ensureExists(storyId);

    return await this.chapterModel
      .find({ storyId })
      .select('-contents')
      .sort({ order: 1 })
      .exec();
  }

  /**
   * Returns a single chapter of the story, including its contents.
   *
   * @throws AppException 404 if the story has no chapter with this id
   */
  async findOne(storyId: Types.ObjectId, id: Types.ObjectId) {
    const chapter = await this.chapterModel
      .findOne({ _id: id, storyId })
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }
    return chapter;
  }

  /**
   * Updates only the fields sent (PATCH) and returns the updated chapter.
   * A new title is copied into the story's chapterOrder too.
   *
   * @throws AppException 404 if the story has no chapter with this id
   */
  async update(
    storyId: Types.ObjectId,
    id: Types.ObjectId,
    updateChapterDto: UpdateChapterDto,
  ): Promise<ChapterDocument> {
    const chapter = await this.chapterModel
      .findOneAndUpdate({ _id: id, storyId }, updateChapterDto, {
        // Return the chapter after the change, not before
        returnDocument: 'after',
        // Apply schema rules (e.g. title max length) to updates too
        runValidators: true,
      })
      .exec();
    if (!chapter) {
      throw AppException.notfound('Chapter not found');
    }

    if (updateChapterDto.title) {
      await this.storyService.renameChapter(storyId, id, chapter.title);
    }
    return chapter;
  }
}
