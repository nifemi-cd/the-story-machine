import { SetMetadata } from '@nestjs/common';

// Metadata key the ResponseInterceptor reads the message from
export const RESPONSE_MESSAGE_KEY = 'response_message';

/**
 * Sets the `message` field of a route's success response.
 * Routes without it get the default message "Success".
 *
 * @example
 * @Post()
 * @ResponseMessage('User created')
 * create() { ... }
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
