import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Schema as MongooseSchema,
  type HydratedDocument,
  type Types,
} from 'mongoose';
import { Story } from '../../story/entities/story.entity.js';
import { Script, ScriptSchema } from './script.entity.js';

/**
 * One chapter of a story, as stored in the "chapters" collection.
 * The story's chapterOrder lists its chapters in reading order.
 * `timestamps: true` makes Mongoose fill in createdAt and updatedAt.
 */
@Schema({ timestamps: true })
export class Chapter {
  // The story this chapter belongs to
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Story.name,
    required: true,
  })
  storyId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string;

  // Position in the story, starting at 0; matches the story's chapterOrder
  @Prop({ required: true, min: 0 })
  order: number;

  // The parsed script the reader plays; null until one is saved through
  // PUT /story/:storyId/chapter/:id/script
  @Prop({ type: ScriptSchema, default: null })
  script: Script | null;

  // Filled in by Mongoose because of timestamps: true
  createdAt: Date;
  updatedAt: Date;
}

// A Chapter loaded from the database, with Mongoose methods like .save()
export type ChapterDocument = HydratedDocument<Chapter>;
export const ChapterSchema = SchemaFactory.createForClass(Chapter);

// Loading a story's chapters in reading order
ChapterSchema.index({ storyId: 1, order: 1 });

ChapterSchema.set('toJSON', { versionKey: false });
