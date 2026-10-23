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
 * One of a character's emotions. Dialogue lines pick one by name as their
 * `portrait`. Field names follow the story JSON contract (snake_case).
 */
@Schema({ _id: false })
export class Emotion {
  @Prop({ required: true, trim: true })
  emotion: string;

  // Placeholders: where the portrait sits on screen, set in a later sprint
  @Prop({ type: Number, default: null })
  portrait_x: number | null;

  @Prop({ type: Number, default: null })
  portrait_y: number | null;
}

export const EmotionSchema = SchemaFactory.createForClass(Emotion);

/**
 * A character in the story. Dialogue lines refer to it by name.
 * Stored as a list rather than the contract's name-keyed object because
 * MongoDB keys can't contain "." (e.g. "Dr. Smith"); the reader endpoint
 * turns the list into that object.
 */
@Schema({ _id: false })
export class Character {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  // Always includes "default", the portrait used when a line doesn't set one
  @Prop({ type: [EmotionSchema], default: [] })
  emotions: Emotion[];
}

export const CharacterSchema = SchemaFactory.createForClass(Character);

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

  // Shared by every chapter, so each chapter's dialogue can use the same cast
  @Prop({ type: [CharacterSchema], default: [] })
  characters: Character[];

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
