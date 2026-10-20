import { ApiProperty } from '@nestjs/swagger';
import { StoryStatus } from '../enums/story-status.enum.js';

/** One entry in a story's table of contents, for the Swagger docs. */
export class ChapterRefResponseDto {
  @ApiProperty({ example: '6ad4306d3168a59d2918aeb1' })
  chapterId: string;

  @ApiProperty({ example: 'The Door in the Cellar' })
  title: string;
}

/** A story's look, for the Swagger docs. Empty means the reader's default. */
export class PresentationResponseDto {
  @ApiProperty({ example: 'Georgia' })
  font: string;

  @ApiProperty({ example: '#1a1a1a' })
  textColor: string;

  @ApiProperty({ example: '#fdf6e3' })
  windowColor: string;
}

/** A story as the API returns it, for the Swagger docs. */
export class StoryResponseDto {
  @ApiProperty({
    description: 'Database id; use it in /story/:id',
    example: '6ad4306d3168a59d2918aeb0',
  })
  _id: string;

  @ApiProperty({ example: '6ad4306d3168a59d2918aead' })
  authorId: string;

  @ApiProperty({ example: 'The Lighthouse Keeper' })
  title: string;

  @ApiProperty({
    example: 'A storm, a stranger, and three doors you should not open.',
  })
  description: string;

  @ApiProperty({
    enum: StoryStatus,
    enumName: 'StoryStatus',
    example: StoryStatus.Draft,
  })
  status: StoryStatus;

  @ApiProperty({
    description: 'Link to the draft file in blob storage (not used yet)',
    type: String,
    nullable: true,
    example: null,
  })
  draftUrl: string | null;

  @ApiProperty({
    description: 'When the story was published; null while a draft',
    type: Date,
    nullable: true,
    example: null,
  })
  publishedAt: Date | null;

  @ApiProperty({
    description: 'Chapters in reading order',
    type: [ChapterRefResponseDto],
  })
  chapterOrder: ChapterRefResponseDto[];

  @ApiProperty({ type: PresentationResponseDto })
  presentation: PresentationResponseDto;

  @ApiProperty({ example: 0 })
  likeCount: number;

  @ApiProperty({ example: 0 })
  commentCount: number;

  @ApiProperty({ example: 0 })
  readCount: number;

  @ApiProperty({ example: '2026-10-17T21:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-17T21:30:00.000Z' })
  updatedAt: Date;
}
