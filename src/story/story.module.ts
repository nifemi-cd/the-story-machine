import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoryService } from './story.service.js';
import { StoryController } from './story.controller.js';
import { Story, StorySchema } from './entities/story.entity.js';
import { User, UserSchema } from '../user/entities/user.entity.js';

/** Everything for stories: the routes, the service and the Story model. */
@Module({
  imports: [
    // Makes the models injectable with @InjectModel(...)
    // (User is only read, to check a story's author exists)
    MongooseModule.forFeature([
      { name: Story.name, schema: StorySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StoryController],
  providers: [StoryService],
  // The chapter module uses it to keep chapterOrder in step
  exports: [StoryService],
})
export class StoryModule {}
