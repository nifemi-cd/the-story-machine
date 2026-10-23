import {
  Controller,
  Delete,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
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

// Largest story file accepted, in bytes (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  /** DELETE /api/v1/story/:id: delete a story and its chapters for good. */
  @Delete(':id')
  @ResponseMessage('Story deleted')
  @ApiOperation({
    summary: 'Delete a story',
    description:
      'Permanently deletes the story and all of its chapters. This cannot be undone.',
  })
  @ApiObjectIdParam('Story')
  @ApiEnvelope(null, { description: 'Story deleted' })
  @ApiError(400, 'The id is not a valid 24-character hex string')
  @ApiError(404, 'Story not found')
  remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.storyService.remove(id);
  }

  /** PUT /api/v1/story/:id/file: upload the story's .txt draft file. */
  @Put(':id/file')
  @ResponseMessage('Story file uploaded')
  // Reads the "file" form field into memory; larger files are rejected with a 413
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  @ApiOperation({
    summary: 'Upload the story file',
    description:
      'Saves a plain text (.txt) file of up to 10 MB as the story draft, replacing any earlier file.',
  })
  @ApiObjectIdParam('Story')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiEnvelope(StoryResponseDto, { description: 'Story file uploaded' })
  @ApiError(400, 'Invalid id, or the file is missing or not plain text')
  @ApiError(404, 'Story not found')
  @ApiError(413, 'File is larger than 10 MB')
  uploadFile(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.storyService.uploadFile(id, file);
  }

  /** GET /api/v1/story/:id/file: download the story's .txt draft file. */
  @Get(':id/file')
  @ApiOperation({
    summary: 'Download the story file',
    description: 'Sent as a plain text file, not wrapped in { success, data }.',
  })
  @ApiObjectIdParam('Story')
  @ApiProduces('text/plain')
  @ApiError(400, 'The id is not a valid 24-character hex string')
  @ApiError(404, 'Story not found, or it has no file yet')
  async downloadFile(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    const content = await this.storyService.getFile(id);
    return new StreamableFile(content, {
      type: 'text/plain; charset=utf-8',
      disposition: `attachment; filename="story-${id.toString()}.txt"`,
    });
  }
}
