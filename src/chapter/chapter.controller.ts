import { Controller, Get, Post, Body, Patch, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { ChapterService } from './chapter.service.js';
import { CreateChapterDto } from './dto/create-chapter.dto.js';
import { UpdateChapterDto } from './dto/update-chapter.dto.js';
import { ChapterResponseDto } from './dto/chapter-response.dto.js';
import { ReaderChapterResponseDto } from './dto/reader-chapter-response.dto.js';
import { ScriptDto } from './dto/script.dto.js';
import { ResponseMessage } from '../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import {
  ApiEnvelope,
  ApiError,
} from '../common/swagger/api-response.decorators.js';
import { ApiObjectIdParam } from '../common/swagger/api-param.decorators.js';

/**
 * Chapter routes under /api/v1/story/:storyId/chapter, so every chapter is
 * reached through its story. Request bodies are validated against their DTOs
 * before these methods run, and responses are wrapped in
 * `{ success, message, data }` by the ResponseInterceptor.
 *
 * The @Api* decorators only describe the routes for the docs at /api/docs.
 */
@ApiTags('Chapters')
@ApiObjectIdParam('Story', 'storyId')
@Controller({ path: 'story/:storyId/chapter', version: '1' })
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  /** POST /api/v1/story/:storyId/chapter: add a chapter to the end of a story. */
  @Post()
  @ResponseMessage('Chapter created')
  @ApiOperation({
    summary: 'Add a chapter',
    description:
      "Adds the chapter to the end of the story's chapterOrder. Its script starts as null.",
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
    description: 'In reading order. Scripts are left out.',
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

  /** GET /api/v1/story/:storyId/chapter/:id: get one chapter with its script. */
  @Get(':id')
  @ResponseMessage('Chapter fetched')
  @ApiOperation({ summary: 'Get a chapter by id' })
  @ApiObjectIdParam('Chapter')
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
  @ApiObjectIdParam('Chapter')
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

  /** PUT /api/v1/story/:storyId/chapter/:id/script: save a chapter's parsed script. */
  @Put(':id/script')
  @ResponseMessage('Script saved')
  @ApiOperation({
    summary: "Save a chapter's script",
    description:
      'Replaces the whole script with the JSON the frontend parser produced. ' +
      "Besides its shape, the script is checked against the story: line ids match positions, every goto_line and flag points to a real line, and dialogue uses the story's characters and their emotions.",
  })
  @ApiObjectIdParam('Chapter')
  @ApiEnvelope(ChapterResponseDto, { description: 'Script saved' })
  @ApiError(400, 'Invalid storyId or id, or the script is invalid')
  @ApiError(404, 'Story not found, or chapter not found in this story')
  saveScript(
    @Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() scriptDto: ScriptDto,
  ) {
    return this.chapterService.saveScript(storyId, id, scriptDto);
  }

  /** GET /api/v1/story/:storyId/chapter/:id/read: the chapter as the reader plays it. */
  @Get(':id/read')
  @ResponseMessage('Chapter fetched for reading')
  @ApiOperation({
    summary: 'Get a chapter for the reader',
    description:
      "The story JSON contract: the story's title, author and characters around this chapter's script.",
  })
  @ApiObjectIdParam('Chapter')
  @ApiEnvelope(ReaderChapterResponseDto, {
    description: 'Chapter fetched for reading',
  })
  @ApiError(400, 'Invalid storyId or id')
  @ApiError(404, 'Chapter not found in this story')
  findForReader(
    @Param('storyId', ParseObjectIdPipe) storyId: Types.ObjectId,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.chapterService.findForReader(storyId, id);
  }
}
