import { ApiParam } from '@nestjs/swagger';

/**
 * Documents a MongoDB ObjectId route parameter. Without it Swagger would
 * describe the param as an ObjectId class instead of a string.
 *
 * @param resource label shown in the description, e.g. 'Story'
 * @param name the route parameter, 'id' by default
 *
 * @example
 * @ApiObjectIdParam('Story', 'storyId')
 */
export function ApiObjectIdParam(resource: string, name = 'id') {
  return ApiParam({
    name,
    type: String,
    description: `${resource} id (24-character hex)`,
    example: '6ad4306d3168a59d2918aeb0',
  });
}
