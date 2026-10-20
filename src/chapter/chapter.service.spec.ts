import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppException } from '../common/exceptions/app.exception.js';
import { StoryService } from '../story/story.service.js';
import { ChapterService } from './chapter.service.js';
import { Chapter } from './entities/chapter.entity.js';

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
  };
  const storyService = {
    addChapter: vi.fn(),
    removeChapter: vi.fn(),
    renameChapter: vi.fn(),
    ensureExists: vi.fn(),
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
    it("returns the story's chapters in order without contents", async () => {
      const chapters = [{ title: 'One' }, { title: 'Two' }];
      query.exec.mockResolvedValue(chapters);

      await expect(service.findAll(storyId)).resolves.toBe(chapters);
      expect(storyService.ensureExists).toHaveBeenCalledWith(storyId);
      expect(chapterModel.find).toHaveBeenCalledWith({ storyId });
      expect(query.select).toHaveBeenCalledWith('-contents');
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
});
