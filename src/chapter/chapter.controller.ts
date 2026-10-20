import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ChapterService } from './chapter.service.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ChapterResponseDto } from './dto/chapter-response.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  ApiEnvelope,
  ApiError,
} from '../common/swagger/api-response.decorators.js';

// Documents the route parameters; without them Swagger would describe them as ObjectId classes
const ApiStoryIdParam = () =>
  ApiParam({
    name: 'storyId',
    type: String,
    description: 'Story id (24-character hex)',
    example: '6ad4306d3168a59d2918aeb0',
  });

const ApiChapterIdParam = () =>
  ApiParam({
    name: 'id',
    type: String,
    description: 'Chapter id (24-character hex)',
    example: '6ad4306d3168a59d2918aeb1',
  });

/**
 * Chapter routes under /api/v1/story/:storyId/chapter, so every chapter is
 * reached through its story. Request bodies are validated against their DTOs
 * before these methods run, and responses are wrapped in
 * `{ success, message, data }` by the ResponseInterceptor.
 *
 * The @Api* decorators only describe the routes for the docs at /api/docs.
 */
@ApiTags('Chapters')
@ApiStoryIdParam()
@Controller({ path: 'story/:storyId/chapter', version: '1' })
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  /** POST /api/v1/story/:storyId/chapter: add a chapter to the end of a story. */
  @Post()
  @ResponseMessage('Chapter created')
  @ApiOperation({
    summary: 'Add a chapter',
    description:
      "Adds the chapter to the end of the story's chapterOrder. Contents start empty.",
  })
  @ApiEnvelope(ChapterResponseDto, {
    status: 201,
    description: 'Chapter created',
  })
  @ApiError(400, 'Invalid storyId, or a field failed validation')
  @ApiError(404, 'Story not found')
  create(
    @Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId,
    @Body() createChapterDto: CreateChapterDto,
  ) {
    return this.chapterService.create(storyId, createChapterDto);
  }

  /** GET /api/v1/story/:storyId/chapter: list a story's chapters in order. */
  @Get()
  @ResponseMessage('Chapters fetched')
  @ApiOperation({
    summary: "List a story's chapters",
    description: 'In reading order. Contents are left out.',
  })
  @ApiEnvelope(ChapterResponseDto, {
    description: 'Chapters fetched',
    isArray: true,
  })
  @ApiError(400, 'Invalid storyId')
  @ApiError(404, 'Story not found')
  findAll(@Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId) {
    return this.chapterService.findAll(storyId);
  }

  /** GET /api/v1/story/:storyId/chapter/:id: get one chapter with its contents. */
  @Get(':id')
  @ResponseMessage('Chapter fetched')
  @ApiOperation({ summary: 'Get a chapter by id' })
  @ApiChapterIdParam()
  @ApiEnvelope(ChapterResponseDto, { description: 'Chapter fetched' })
  @ApiError(400, 'Invalid storyId or id')
  @ApiError(404, 'Chapter not found in this story')
  findOne(
    @Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.chapterService.findOne(storyId, id);
  }

  /** PATCH /api/v1/story/:storyId/chapter/:id: change a chapter's fields. */
  @Patch(':id')
  @ResponseMessage('Chapter updated')
  @ApiOperation({
    summary: 'Update a chapter',
    description: 'Send only the fields to change.',
  })
  @ApiChapterIdParam()
  @ApiEnvelope(ChapterResponseDto, { description: 'Chapter updated' })
  @ApiError(400, 'Invalid storyId or id, or a field failed validation')
  @ApiError(404, 'Chapter not found in this story')
  update(
    @Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateChapterDto: UpdateChapterDto,
  ) {
    return this.chapterService.update(storyId, id, updateChapterDto);
  }
}
