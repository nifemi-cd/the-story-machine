import { model, Types } from 'mongoose';
import { Story, StorySchema } from './story.entity.js';

describe('StorySchema', () => {
  it('starts as an empty draft with zero counts', () => {
    const StoryModel = model(Story.name, StorySchema);
    const story = new StoryModel({
      authorId: new Types.ObjectId(),
      title: 'The Lighthouse Keeper',
    });

    const json = JSON.parse(JSON.stringify(story)) as Record<string, unknown>;

    expect(json).toMatchObject({
      status: 'draft',
      description: '',
      draftUrl: null,
      publishedAt: null,
      chapterOrder: [],
      presentation: { font: '', textColor: '', windowColor: '' },
      likeCount: 0,
      commentCount: 0,
      readCount: 0,
    });
    expect(json).not.toHaveProperty('__v');
    // Sub-documents don't get their own ids
    expect(json.presentation).not.toHaveProperty('_id');
  });
});
