import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChapterService } from './chapter.service.js';
import { ChapterController } from './chapter.controller.js';
import { Chapter, ChapterSchema } from './entities/chapter.entity.js';
import { StoryModule } from '../story/story.module.js';

/** Everything for chapters: the routes, the service and the Chapter model. */
@Module({
  imports: [
    // Makes the Chapter model injectable with @InjectModel(Chapter.name)
    MongooseModule.forFeature([{ name: Chapter.name, schema: ChapterSchema }]),
    // For StoryService, which keeps each story's chapterOrder in step
    StoryModule,
  ],
  controllers: [ChapterController],
  providers: [ChapterService],
})
export class ChapterModule {}
