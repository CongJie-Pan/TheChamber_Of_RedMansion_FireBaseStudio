/**
 * @fileOverview Community Type Definitions
 *
 * Shared type definitions for community features that can be safely imported
 * by both client-side and server-side code.
 *
 * This file contains only type definitions and interfaces - no runtime code
 * or database dependencies. Safe for client-side bundle inclusion.
 *
 * @phase Phase 3 - SQLITE-017 Community Service Integration
 * @date 2025-10-30
 */

/**
 * Data required to create a community post
 *
 * Used by both:
 * - Client-side code to construct POST requests
 * - Server-side API routes to validate requests
 * - Server-side services to create posts in database
 */
export interface CreatePostData {
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags: string[];
  category?: string;
}

/**
 * Data required to create a comment on a post
 */
export interface CreateCommentData {
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
}

/**
 * Filters for querying posts
 */
export interface PostFilters {
  category?: string;
  tags?: string[];
  authorId?: string;
  searchText?: string;
}

/**
 * API response for post creation
 */
export interface CreatePostResponse {
  success: boolean;
  postId?: string;
  error?: string;
  details?: any;
}
