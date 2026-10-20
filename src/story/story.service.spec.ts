import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AppException } from '../common/exceptions/app.exception.js';
import { User } from '../user/entities/user.entity.js';
import { StoryService } from './story.service.js';
import { Story } from './entities/story.entity.js';
import { StoryStatus } from './enums/story-status.enum.js';

/** Wraps a value the way Mongoose queries return it from .exec(). */
const execResolving = (value: unknown) => ({
  exec: () => Promise.resolve(value),
});

describe('StoryService', () => {
  let service: StoryService;
  const authorId = new Types.ObjectId().toString();
  // find() returns a chainable query; each step records its argument
  const query = {
    sort: vi.fn(() => query),
    skip: vi.fn(() => query),
    limit: vi.fn(() => query),
    exec: vi.fn(),
  };
  const storyModel = {
    create: vi.fn(),
    find: vi.fn(() => query),
    countDocuments: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    exists: vi.fn(),
    updateOne: vi.fn(),
  };
  const userModel = { exists: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    userModel.exists.mockResolvedValue({ _id: authorId });
    storyModel.create.mockImplementation((doc: object) =>
      Promise.resolve({ _id: 'new-id', ...doc }),
    );
    storyModel.updateOne.mockReturnValue(execResolving({}));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryService,
        { provide: getModelToken(Story.name), useValue: storyModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<StoryService>(StoryService);
  });

  describe('create', () => {
    const dto = { authorId, title: 'The Lighthouse Keeper' };

    it('saves the story when the author exists', async () => {
      await service.create({ ...dto });

      expect(userModel.exists).toHaveBeenCalledWith({ _id: authorId });
      expect(storyModel.create).toHaveBeenCalledWith(dto);
    });

    it('rejects an unknown author with a 400 on authorId', async () => {
      userModel.exists.mockResolvedValue(null);

      const error = await service.create({ ...dto }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(400);
      expect(error).toMatchObject({ errors: [{ field: 'authorId' }] });
      expect(storyModel.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      query.exec.mockResolvedValue([{ title: 'a' }]);
      storyModel.countDocuments.mockReturnValue(execResolving(21));
    });

    it('returns the page of stories with pagination meta', async () => {
      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result).toEqual({
        items: [{ title: 'a' }],
        meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
      });
      expect(query.skip).toHaveBeenCalledWith(20);
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    });

    it('lists every story when no filters are given', async () => {
      await service.findAll({ page: 1, limit: 20 });

      expect(storyModel.find).toHaveBeenCalledWith({});
      expect(storyModel.countDocuments).toHaveBeenCalledWith({});
    });

    it('filters by author and status, counting with the same filter', async () => {
      await service.findAll({
        page: 1,
        limit: 20,
        authorId,
        status: StoryStatus.Published,
      });

      const filter = {
        authorId: new Types.ObjectId(authorId),
        status: StoryStatus.Published,
      };
      expect(storyModel.find).toHaveBeenCalledWith(filter);
      expect(storyModel.countDocuments).toHaveBeenCalledWith(filter);
    });
  });

  describe('findOne', () => {
    const id = new Types.ObjectId();

    it('returns the story', async () => {
      const story = { _id: id, title: 'a' };
      storyModel.findById.mockReturnValue(execResolving(story));

      await expect(service.findOne(id)).resolves.toBe(story);
    });

    it('throws a 404 when the story does not exist', async () => {
      storyModel.findById.mockReturnValue(execResolving(null));

      const error = await service.findOne(id).catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });

  describe('update', () => {
    const id = new Types.ObjectId();
    const updated = { _id: id, title: 'New' };

    beforeEach(() => {
      storyModel.findByIdAndUpdate.mockReturnValue(execResolving(updated));
    });

    /** The changes passed to findByIdAndUpdate by the last update() call. */
    const sentChanges = () =>
      storyModel.findByIdAndUpdate.mock.calls[0][1] as Record<string, unknown>;

    it('applies only the sent fields and returns the updated story', async () => {
      await expect(
        service.update(id, { title: 'New', description: undefined }),
      ).resolves.toBe(updated);

      expect(storyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { title: 'New' },
        { returnDocument: 'after', runValidators: true },
      );
      // Without a status change there's no need to load the story first
      expect(storyModel.findById).not.toHaveBeenCalled();
    });

    it('changes only the presentation fields sent', async () => {
      await service.update(id, {
        presentation: { font: 'Georgia', textColor: undefined },
      });

      expect(sentChanges()).toEqual({ 'presentation.font': 'Georgia' });
    });

    it('sets publishedAt when a draft is published', async () => {
      storyModel.findById.mockReturnValue(
        execResolving({ status: StoryStatus.Draft }),
      );

      await service.update(id, { status: StoryStatus.Published });

      expect(sentChanges()).toEqual({
        status: StoryStatus.Published,
        publishedAt: expect.any(Date),
      });
    });

    it('clears publishedAt when a story goes back to draft', async () => {
      storyModel.findById.mockReturnValue(
        execResolving({ status: StoryStatus.Published }),
      );

      await service.update(id, { status: StoryStatus.Draft });

      expect(sentChanges()).toEqual({
        status: StoryStatus.Draft,
        publishedAt: null,
      });
    });

    it('keeps the original publishedAt when re-sending the same status', async () => {
      storyModel.findById.mockReturnValue(
        execResolving({ status: StoryStatus.Published }),
      );

      await service.update(id, { status: StoryStatus.Published });

      expect(sentChanges()).toEqual({});
    });

    it('throws a 404 when the story does not exist', async () => {
      storyModel.findByIdAndUpdate.mockReturnValue(execResolving(null));

      const error = await service
        .update(id, { title: 'New' })
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });

  describe('chapterOrder helpers', () => {
    const storyId = new Types.ObjectId();
    const chapterId = new Types.ObjectId();

    it('appends a chapter and returns its position', async () => {
      storyModel.findByIdAndUpdate.mockReturnValue(
        execResolving({
          chapterOrder: [
            { chapterId: new Types.ObjectId(), title: 'One' },
            { chapterId, title: 'Two' },
          ],
        }),
      );

      await expect(service.addChapter(storyId, chapterId, 'Two')).resolves.toBe(
        1,
      );
      expect(storyModel.findByIdAndUpdate).toHaveBeenCalledWith(
        storyId,
        { $push: { chapterOrder: { chapterId, title: 'Two' } } },
        { returnDocument: 'after', projection: { chapterOrder: 1 } },
      );
    });

    it('throws a 404 when adding to a missing story', async () => {
      storyModel.findByIdAndUpdate.mockReturnValue(execResolving(null));

      const error = await service
        .addChapter(storyId, chapterId, 'Two')
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });

    it('renames the matching chapterOrder entry', async () => {
      await service.renameChapter(storyId, chapterId, 'Renamed');

      expect(storyModel.updateOne).toHaveBeenCalledWith(
        { _id: storyId, 'chapterOrder.chapterId': chapterId },
        { $set: { 'chapterOrder.$.title': 'Renamed' } },
      );
    });

    it('removes a chapter from chapterOrder', async () => {
      await service.removeChapter(storyId, chapterId);

      expect(storyModel.updateOne).toHaveBeenCalledWith(
        { _id: storyId },
        { $pull: { chapterOrder: { chapterId } } },
      );
    });

    it('ensureExists throws a 404 for a missing story', async () => {
      storyModel.exists.mockResolvedValue(null);

      const error = await service
        .ensureExists(storyId)
        .catch((e: unknown) => e);

      expect((error as AppException).getStatus()).toBe(404);
    });
  });
});
