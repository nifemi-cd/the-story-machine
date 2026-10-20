/**
 * Where a story is in its life. Only the author sees a draft; published
 * stories are open to readers.
 */
export enum StoryStatus {
  // Default for every new story
  Draft = 'draft',
  // Visible to readers; publishedAt records when this happened
  Published = 'published',
}
