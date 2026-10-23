import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { model, Types } from 'mongoose';
import { lionCharacters, lionScript } from '../../test/fixtures/story-json.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { Story, StorySchema } from '../story/entities/story.entity.js';
import { StoryService } from '../story/story.service.js';
import { ChapterService } from './chapter.service.js';
import type { ScriptDto } from './dto/script.dto.js';
import { Chapter, ChapterSchema } from './entities/chapter.entity.js';

/** Wraps a value the way Mongoose queries return it from .exec(). */
const execResolving = (value: unknown) => ({
  exec: () => Promise.resolve(value),
});

describe('ChapterService', () => {
  let service: ChapterService;
  const storyId = new Types.ObjectId();
  const id = new Types.ObjectId();
  // find() returns a chainable query; each step records its argument
  const query = {
    select: vi.fn(() => query),
    sort: vi.fn(() => query),
    exec: vi.fn(),
  };
  const chapterModel = {
    create: vi.fn(),
    find: vi.fn(() => query),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    updateMany: vi.fn(),
  };
  const storyService = {
    addChapter: vi.fn(),
    removeChapter: vi.fn(),
    renameChapter: vi.fn(),
    ensureExists: vi.fn(),
    findOne: vi.fn(),
    findWithAuthorName: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    storyService.addChapter.mockResolvedValue(2);
    chapterModel.create.mockImplementation((doc: object) =>
      Promise.resolve(doc),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChapterService,
        { provide: getModelToken(Chapter.name), useValue: chapterModel },
        { provide: StoryService, useValue: storyService },
      ],
    }).compile();

    service = module.get<ChapterService>(ChapterService);
  });

  describe('create', () => {
    it('adds the chapter to the story and saves it at that position', async () => {
      await service.create(storyId, { title: 'The Cellar' });

      const [, chapterId, title] = storyService.addChapter.mock.calls[0] as [
        Types.ObjectId,
        Types.ObjectId,
        string,
      ];
      expect(storyService.addChapter.mock.calls[0][0]).toBe(storyId);
      expect(title).toBe('The Cellar');
      // The chapter is saved under the same id the story lists
      expect(chapterModel.create).toHaveBeenCalledWith({
        _id: chapterId,
        storyId,
        order: 2,
        title: 'The Cellar',
      });
    });

    it('does not save the chapter when the story does not exist', async () => {
      storyService.addChapter.mockRejectedValue(
        AppException.notfound('Story not found'),
      );

      const error = await service
        .create(storyId, { title: 'The Cellar' })
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
      expect(chapterModel.create).not.toHaveBeenCalled();
    });

    it('takes the chapter back out of the story if saving fails', async () => {
      const dbError = new Error('connection lost');
      chapterModel.create.mockRejectedValue(dbError);

      await expect(
        service.create(storyId, { title: 'The Cellar' }),
      ).rejects.toBe(dbError);

      const chapterId = storyService.addChapter.mock.calls[0][1] as unknown;
      expect(storyService.removeChapter).toHaveBeenCalledWith(
        storyId,
        chapterId,
      );
    });
  });

  describe('findAll', () => {
    it("returns the story's chapters in order without scripts", async () => {
      const chapters = [{ title: 'One' }, { title: 'Two' }];
      query.exec.mockResolvedValue(chapters);

      await expect(service.findAll(storyId)).resolves.toBe(chapters);
      expect(storyService.ensureExists).toHaveBeenCalledWith(storyId);
      expect(chapterModel.find).toHaveBeenCalledWith({ storyId });
      expect(query.select).toHaveBeenCalledWith('-script');
      expect(query.sort).toHaveBeenCalledWith({ order: 1 });
    });

    it('throws a 404 when the story does not exist', async () => {
      storyService.ensureExists.mockRejectedValue(
        AppException.notfound('Story not found'),
      );

      const error = await service.findAll(storyId).catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
      expect(chapterModel.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('looks the chapter up within the story', async () => {
      const chapter = { _id: id, title: 'One' };
      chapterModel.findOne.mockReturnValue(execResolving(chapter));

      await expect(service.findOne(storyId, id)).resolves.toBe(chapter);
      expect(chapterModel.findOne).toHaveBeenCalledWith({ _id: id, storyId });
    });

    it('throws a 404 when the story has no such chapter', async () => {
      chapterModel.findOne.mockReturnValue(execResolving(null));

      const error = await service.findOne(storyId, id).catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });

  describe('update', () => {
    it('updates the chapter and copies a new title into the story', async () => {
      const updated = { _id: id, title: 'Renamed' };
      chapterModel.findOneAndUpdate.mockReturnValue(execResolving(updated));

      await expect(
        service.update(storyId, id, { title: 'Renamed' }),
      ).resolves.toBe(updated);
      expect(chapterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, storyId },
        { title: 'Renamed' },
        { returnDocument: 'after', runValidators: true },
      );
      expect(storyService.renameChapter).toHaveBeenCalledWith(
        storyId,
        id,
        'Renamed',
      );
    });

    it('leaves the story alone when the title is not changed', async () => {
      chapterModel.findOneAndUpdate.mockReturnValue(execResolving({ _id: id }));

      await service.update(storyId, id, {});

      expect(storyService.renameChapter).not.toHaveBeenCalled();
    });

    it('throws a 404 when the story has no such chapter', async () => {
      chapterModel.findOneAndUpdate.mockReturnValue(execResolving(null));

      const error = await service
        .update(storyId, id, { title: 'Renamed' })
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
      expect(storyService.renameChapter).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      chapterModel.updateMany.mockReturnValue(execResolving({}));
    });

    it('deletes the chapter, takes it out of the story and moves later chapters up', async () => {
      chapterModel.findOneAndDelete.mockReturnValue(
        execResolving({ _id: id, order: 1 }),
      );

      await expect(service.remove(storyId, id)).resolves.toBeUndefined();
      expect(chapterModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: id,
        storyId,
      });
      expect(storyService.removeChapter).toHaveBeenCalledWith(storyId, id);
      expect(chapterModel.updateMany).toHaveBeenCalledWith(
        { storyId, order: { $gt: 1 } },
        { $inc: { order: -1 } },
      );
    });

    it('throws a 404 and changes nothing else when the story has no such chapter', async () => {
      chapterModel.findOneAndDelete.mockReturnValue(execResolving(null));

      const error = await service.remove(storyId, id).catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
      expect(storyService.removeChapter).not.toHaveBeenCalled();
      expect(chapterModel.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('saveScript', () => {
    // Plain request bodies stand in for ScriptDto; only their shape matters here
    const script = lionScript as unknown as ScriptDto;

    beforeEach(() => {
      storyService.findOne.mockResolvedValue({ characters: lionCharacters });
    });

    it('checks the script against the story and saves it', async () => {
      const saved = { _id: id };
      chapterModel.findOneAndUpdate.mockReturnValue(execResolving(saved));

      await expect(service.saveScript(storyId, id, script)).resolves.toBe(
        saved,
      );
      expect(storyService.findOne).toHaveBeenCalledWith(storyId);
      expect(chapterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, storyId },
        { script: lionScript },
        { returnDocument: 'after', runValidators: true },
      );
    });

    it('rejects a script that uses a character the story does not have', async () => {
      storyService.findOne.mockResolvedValue({ characters: [] });

      const error = await service
        .saveScript(storyId, id, script)
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(400);
      expect(error).toMatchObject({
        message: 'Script is invalid',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'lines.2.dialogue.name' }),
        ]),
      });
      expect(chapterModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('throws a 404 when the story has no such chapter', async () => {
      chapterModel.findOneAndUpdate.mockReturnValue(execResolving(null));

      const error = await service
        .saveScript(storyId, id, script)
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });

  describe('findForReader', () => {
    // Real documents, so toJSON behaves as it does with the database
    const StoryModel = model(Story.name, StorySchema);
    const ChapterModel = model(Chapter.name, ChapterSchema);
    const story = new StoryModel({
      _id: storyId,
      authorId: new Types.ObjectId(),
      title: 'The Lion at the Door',
      characters: lionCharacters,
    });

    beforeEach(() => {
      storyService.findWithAuthorName.mockResolvedValue({
        story,
        author: 'mock-author',
      });
    });

    it('returns the chapter in the story JSON contract shape', async () => {
      const chapter = new ChapterModel({
        _id: id,
        storyId,
        title: 'Chapter 1',
        order: 0,
        script: lionScript,
      });
      chapterModel.findOne.mockReturnValue(execResolving(chapter));

      const result = await service.findForReader(storyId, id);

      expect(JSON.parse(JSON.stringify(result))).toStrictEqual({
        title: 'The Lion at the Door',
        author: 'mock-author',
        story_id: storyId.toString(),
        chapter_id: id.toString(),
        chapter_name: 'Chapter 1',
        characters: {
          Dave: lionCharacters[0],
          Cindy: lionCharacters[1],
        },
        story: lionScript,
      });
    });

    it('gives a chapter without a script an empty one', async () => {
      chapterModel.findOne.mockReturnValue(
        execResolving(
          new ChapterModel({ _id: id, storyId, title: 'Draft', order: 0 }),
        ),
      );

      const result = await service.findForReader(storyId, id);

      expect(result.story).toEqual({ flags: {}, variables: [], lines: [] });
    });

    it('throws a 404 when the story has no such chapter', async () => {
      chapterModel.findOne.mockReturnValue(execResolving(null));

      const error = await service
        .findForReader(storyId, id)
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });
});
