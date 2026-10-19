import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  ApiEnvelope,
  ApiError,
} from '../common/swagger/api-response.decorators.js';

// Documents the :id route parameter; without it Swagger would describe it as an ObjectId class
const ApiUserIdParam = () =>
  ApiParam({
    name: 'id',
    type: String,
    description: 'User id (24-character hex)',
    example: '6ad4306d3168a59d2918aead',
  });

/**
 * User routes under /api/v1/user. Request bodies are validated against
 * their DTOs before these methods run, and responses are wrapped in
 * `{ success, message, data }` by the ResponseInterceptor.
 *
 * The @Api* decorators only describe the routes for the docs at /api/docs.
 */
@ApiTags('Users')
@Controller({ path: 'user', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** POST /api/v1/user: register a new user. */
  @Post()
  @ResponseMessage('User created')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates an account with the "user" role. The password is hashed and never returned.',
  })
  @ApiEnvelope(UserResponseDto, { status: 201, description: 'User created' })
  @ApiError(400, 'A field failed validation, or an unknown field was sent')
  @ApiError(409, 'Email or username already taken')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  /** GET /api/v1/user?page=1&limit=20: list users one page at a time. */
  @Get()
  @ResponseMessage('Users fetched')
  @ApiOperation({ summary: 'List users', description: 'Newest users first.' })
  @ApiEnvelope(UserResponseDto, {
    description: 'Users fetched',
    paginated: true,
  })
  @ApiError(400, 'page or limit is not a whole number in range')
  findAll(@Query() query: PaginationQueryDto) {
    return this.userService.findAll(query);
  }

  /** GET /api/v1/user/:id: get one user. */
  @Get(':id')
  @ResponseMessage('User fetched')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiUserIdParam()
  @ApiEnvelope(UserResponseDto, { description: 'User fetched' })
  @ApiError(400, 'The id is not a valid 24-character hex string')
  @ApiError(404, 'User not found')
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.userService.findOne(id);
  }

  /** PATCH /api/v1/user/:id: change some of a user's profile fields. */
  @Patch(':id')
  @ResponseMessage('User updated')
  @ApiOperation({
    summary: "Update a user's profile",
    description:
      'Send only the fields to change. Email and password cannot be changed here.',
  })
  @ApiUserIdParam()
  @ApiEnvelope(UserResponseDto, { description: 'User updated' })
  @ApiError(
    400,
    'Invalid id, a field failed validation, or email/password was sent',
  )
  @ApiError(404, 'User not found')
  @ApiError(409, 'Username already taken by another user')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }
}
