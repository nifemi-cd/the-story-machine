import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  type HydratedDocument,
  type Types,
} from 'mongoose';
import { User } from '../../user/entities/user.entity.js';
import { StoryStatus } from '../enums/story-status.enum.js';

/**
 * One entry in a story's table of contents. The title is copied from the
 * chapter so the contents can be shown without loading every chapter.
 * `_id: false` because the chapterId already identifies the entry.
 */
@Schema({ _id: false })
export class ChapterRef {
  // Named as a string to avoid a circular import with the chapter entity
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Chapter', required: true })
  chapterId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;
}

export const ChapterRefSchema = SchemaFactory.createForClass(ChapterRef);

/**
 * How the story looks to readers. Empty values mean "use the reader's
 * default theme".
 */
@Schema({ _id: false })
export class Presentation {
  @Prop({ trim: true, default: '' })
  font: string;

  // Hex colours, e.g. "#1a1a1a"
  @Prop({ default: '' })
  textColor: string;

  @Prop({ default: '' })
  windowColor: string;
}

export const PresentationSchema = SchemaFactory.createForClass(Presentation);

/**
 * A story as stored in the "stories" collection. Its chapters live in their
 * own collection; `chapterOrder` keeps their order and titles here.
 * `timestamps: true` makes Mongoose fill in createdAt and updatedAt.
 */
@Schema({ timestamps: true })
export class Story {
  // The user who wrote the story
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  @Prop({ trim: true, maxlength: 2000, default: '' })
  description: string;

  @Prop({
    type: String,
    enum: StoryStatus,
    default: StoryStatus.Draft,
  })
  status: StoryStatus;

  // Placeholder: link to the draft file in Azure Blob Storage, set once uploads exist
  @Prop({ type: String, default: null })
  draftUrl: string | null;

  // Set when the story is published; cleared if it goes back to draft
  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  // Kept in step by the chapter routes, never set directly from requests
  @Prop({ type: [ChapterRefSchema], default: [] })
  chapterOrder: ChapterRef[];

  // default fills in each field's own default ('')
  @Prop({ type: PresentationSchema, default: () => ({}) })
  presentation: Presentation;

  // Cached counts, so story cards don't have to count records (likes, comments and reads aren't built yet)
  @Prop({ default: 0, min: 0 })
  likeCount: number;

  @Prop({ default: 0, min: 0 })
  commentCount: number;

  @Prop({ default: 0, min: 0 })
  readCount: number;

  // Filled in by Mongoose because of timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

// A Story loaded from the database, with Mongoose methods like .save()
export type StoryDocument = HydratedDocument<Story>;
export const StorySchema = SchemaFactory.createForClass(Story);

// "My stories" lists, newest first
StorySchema.index({ authorId: 1, createdAt: -1 });
// The published feed, newest first
StorySchema.index({ status: 1, createdAt: -1 });

StorySchema.set('toJSON', { versionKey: false });
