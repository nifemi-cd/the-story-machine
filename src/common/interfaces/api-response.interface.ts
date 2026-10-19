/** Pagination details sent alongside a page of results. */
export interface PaginationMeta {
  page: number;
  limit: number;
  // Number of items across all pages
  total: number;
  totalPages: number;
}

/**
 * What services return from list endpoints. The response interceptor
 * sends `items` as `data` and moves `meta` to the top level of the response.
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Body of every successful response. */
export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
  // Only present on paginated lists
  meta?: PaginationMeta;
}

/** One problem with the request, usually tied to a field. */
export interface FieldError {
  success: boolean;
  // The request field that failed, e.g. "email"; dotted for nested fields
  field?: string;
  message: string;
}

/** Body of every error response. */
export interface ApiErrorResponse {
  success: boolean;
  message: string;
  // Only present when specific fields were wrong
  errors?: FieldError[];
}
