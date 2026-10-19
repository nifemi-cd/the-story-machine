import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { User, UserSchema } from './entities/user.entity.js';

/** Everything for user accounts: the routes, the service and the User model. */
@Module({
  imports: [
    // Makes the User model injectable with @InjectModel(User.name)
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
