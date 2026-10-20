import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { StoryService } from './story.service.js';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import { ListStoriesQueryDto } from './dto/list-stories-query.dto.js';
import { StoryResponseDto } from './dto/story-response.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  ApiEnvelope,
  ApiError,
} from '../common/swagger/api-response.decorators.js';
import { ApiObjectIdParam } from '../common/swagger/api-param.decorators.js';

/**
 * Story routes under /api/v1/story. Request bodies are validated against
 * their DTOs before these methods run, and responses are wrapped in
 * `{ success, message, data }` by the ResponseInterceptor.
 *
 * The @Api* decorators only describe the routes for the docs at /api/docs.
 */
@ApiTags('Stories')
@Controller({ path: 'story', version: '1' })
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  /** POST /api/v1/story: start a new draft story. */
  @Post()
  @ResponseMessage('Story created')
  @ApiOperation({
    summary: 'Create a story',
    description: 'Creates a draft with no chapters.',
  })
  @ApiEnvelope(StoryResponseDto, { status: 201, description: 'Story created' })
  @ApiError(
    400,
    'A field failed validation, an unknown field was sent, or the author does not exist',
  )
  create(@Body() createStoryDto: CreateStoryDto) {
    return this.storyService.create(createStoryDto);
  }

  /** GET /api/v1/story?status=published&page=1: list stories one page at a time. */
  @Get()
  @ResponseMessage('Stories fetched')
  @ApiOperation({
    summary: 'List stories',
    description: 'Newest stories first. Filter by author and/or status.',
  })
  @ApiEnvelope(StoryResponseDto, {
    description: 'Stories fetched',
    paginated: true,
  })
  @ApiError(400, 'A query parameter is invalid')
  findAll(@Query() query: ListStoriesQueryDto) {
    return this.storyService.findAll(query);
  }

  /** GET /api/v1/story/:id: get one story. */
  @Get(':id')
  @ResponseMessage('Story fetched')
  @ApiOperation({ summary: 'Get a story by id' })
  @ApiObjectIdParam('Story')
  @ApiEnvelope(StoryResponseDto, { description: 'Story fetched' })
  @ApiError(400, 'The id is not a valid 24-character hex string')
  @ApiError(404, 'Story not found')
  findOne(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.storyService.findOne(id);
  }

  /** PATCH /api/v1/story/:id: change some of a story's fields, or publish it. */
  @Patch(':id')
  @ResponseMessage('Story updated')
  @ApiOperation({
    summary: 'Update a story',
    description:
      'Send only the fields to change. Setting status publishes or unpublishes the story.',
  })
  @ApiObjectIdParam('Story')
  @ApiEnvelope(StoryResponseDto, { description: 'Story updated' })
  @ApiError(400, 'Invalid id, or a field failed validation')
  @ApiError(404, 'Story not found')
  update(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateStoryDto: UpdateStoryDto,
  ) {
    return this.storyService.update(id, updateStoryDto);
  }
}
