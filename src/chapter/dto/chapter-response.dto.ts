import { ApiProperty } from '@nestjs/swagger';

/** A chapter as the API returns it, for the Swagger docs. */
export class ChapterResponseDto {
  @ApiProperty({
    description: 'Database id; use it in /story/:storyId/chapter/:id',
    example: '6ad4306d3168a59d2918aeb1',
  })
  _id: string;

  @ApiProperty({ example: '6ad4306d3168a59d2918aeb0' })
  storyId: string;

  @ApiProperty({ example: 'The Door in the Cellar' })
  title: string;

  @ApiProperty({ description: 'Position in the story, from 0', example: 0 })
  order: number;

  @ApiProperty({
    description:
      'Parsed chapter for the reader (format not settled yet). Left out of chapter lists.',
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: null,
  })
  contents: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-10-17T21:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-17T21:30:00.000Z' })
  updatedAt: Date;
}
