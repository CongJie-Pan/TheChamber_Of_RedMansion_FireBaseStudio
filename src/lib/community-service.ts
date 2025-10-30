/**
 * @fileOverview Community Service with SQLite-Only Architecture
 *
 * This service handles all community-related database operations including:
 * - Creating, reading, updating, and deleting forum posts
 * - Managing comments and replies on posts
 * - Handling user interactions (likes, views, bookmarks)
 * - Content moderation and validation
 *
 * ARCHITECTURE:
 * - **Database**: SQLite (local database, fast, server-side only)
 * - **Pattern**: Direct SQLite repository calls with server-side enforcement
 *
 * Database Structure:
 * - SQLite: Flat tables (posts, comments) with foreign keys
 *
 * Features implemented:
 * - SQLite-only data access with server-side enforcement
 * - Content validation and sanitization
 * - Error handling and validation
 * - Support for pagination and filtering
 * - Like/unlike functionality with user tracking
 * - Bookmark functionality for user collections
 * - Threaded comment system with nested replies
 *
 * @phase Phase 3 - SQLITE-017 - Community Service Migration
 * @phase Phase 5 - SQLITE-025 - Firebase Removal (Complete SQLite migration)
 */

import { contentFilterService, ModerationAction } from './content-filter-service';

// ============================================================================
// SQLite Repository Imports (Phase 3 - SQLITE-014, SQLITE-015)
// ============================================================================
import {
  createPost as sqliteCreatePost,
  getPostById as sqliteGetPostById,
  getPosts as sqliteGetPosts,
  updatePost as sqliteUpdatePost,
  deletePost as sqliteDeletePost,
  likePost as sqliteLikePost,
  unlikePost as sqliteUnlikePost,
  bookmarkPost as sqliteBookmarkPost,
  unbookmarkPost as sqliteUnbookmarkPost,
  getBookmarkedPostsByUser as sqliteGetBookmarkedPosts,
  incrementViewCount as sqliteIncrementViewCount,
  type CommunityPost as SQLiteCommunityPost,
} from './repositories/community-repository';

import {
  createComment as sqliteCreateComment,
  getCommentsByPost as sqliteGetCommentsByPost,
  deleteComment as sqliteDeleteComment,
  buildCommentTree,
  type Comment as SQLiteComment,
  type CommentTreeNode,
} from './repositories/comment-repository';

import { toUnixTimestamp, fromUnixTimestamp } from './sqlite-db';
import { randomUUID } from 'crypto';

// Import shared type definitions (safe for client-side imports)
import type {
  CreatePostData,
  CreateCommentData,
  PostFilters,
} from '@/types/community';

// ============================================================================
// Server-Side SQLite Enforcement
// ============================================================================

/**
 * SQLite is only available on the server-side (Node.js environment).
 * Client-side code should use API routes to access community data.
 */
const SQLITE_SERVER_ENABLED = typeof window === 'undefined';

// Type definitions for community data structures
// These types are re-exported from SQLite repositories for API compatibility
export type CommunityPost = SQLiteCommunityPost;
export type PostComment = SQLiteComment;
export type { CommentTreeNode };

// Re-export shared types for backward compatibility
export type { CreatePostData, CreateCommentData, PostFilters };

/**
 * Result interface for content creation operations
 * Returns both the created content ID and the moderation action taken
 * This allows callers to make decisions based on content filtering results
 */
export interface CreateContentResult {
  id: string;
  moderationAction: ModerationAction;
}

// Community Service Class
export class CommunityService {
  /**
   * Create a new forum post with automated content filtering
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postData - Data for the new post
   * @returns Promise with the created post ID and moderation action
   */
  async createPost(postData: CreatePostData): Promise<CreateContentResult> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot create post: SQLite only available server-side');
    }

    // Apply content filtering to the post content
    const contentToFilter = `${postData.title || ''} ${postData.content}`.trim();
    const filterResult = await contentFilterService.processContent(
      contentToFilter,
      'temp-post-id', // Temporary ID, will be replaced with actual ID
      'post',
      postData.authorId
    );

    // Check if content should be blocked
    if (filterResult.shouldBlock) {
      console.log(`[CommunityService] Post creation blocked due to content violation: ${filterResult.action}`);
      throw new Error(filterResult.warningMessage || 'Your post contains inappropriate content and cannot be published.');
    }

    // Create the post with filtered content if necessary
    const filteredPostData = { ...postData };
    if (filterResult.processedContent !== contentToFilter) {
      // Content was filtered, store both original and filtered versions
      const titleLength = postData.title?.length || 0;
      if (titleLength > 0 && filterResult.processedContent.length > titleLength) {
        // Split filtered content back into title and content
        filteredPostData.title = filterResult.processedContent.substring(0, titleLength);
        filteredPostData.content = filterResult.processedContent.substring(titleLength).trim();
      } else {
        filteredPostData.content = filterResult.processedContent;
      }
    }

    const postId = randomUUID();
    const createdPost = await sqliteCreatePost({
      id: postId,
      authorId: filteredPostData.authorId,
      authorName: filteredPostData.authorName,
      title: filteredPostData.title,
      content: filteredPostData.content,
      tags: filteredPostData.tags,
      category: filteredPostData.category,
      moderationAction: filterResult.action,
      originalContent: filterResult.processedContent !== contentToFilter ? contentToFilter : undefined,
      moderationWarning: filterResult.warningMessage || undefined,
    });

    // Update the moderation log with the actual post ID
    if (filterResult.action !== 'allow') {
      console.log(`[CommunityService] Post created with moderation action: ${filterResult.action}, ID: ${postId}`);
      // Re-process to update the log with correct post ID
      await contentFilterService.processContent(
        contentToFilter,
        postId,
        'post',
        postData.authorId
      );
    } else {
      console.log(`[CommunityService] Post created successfully, ID: ${postId}`);
    }

    return {
      id: postId,
      moderationAction: filterResult.action,
    };
  }

  /**
   * Get all posts with optional filtering and pagination
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param filters - Optional filters for posts
   * @param limitCount - Number of posts to fetch (default: 20)
   * @param lastDoc - Last document for pagination (not used in SQLite, kept for API compatibility)
   * @returns Promise with array of posts
   */
  async getPosts(
    filters: PostFilters = {},
    limitCount: number = 20,
    lastDoc?: any
  ): Promise<CommunityPost[]> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot fetch posts: SQLite only available server-side');
    }

    console.log('[CommunityService] Fetching posts with filters:', filters);

    // SQLite repository handles filtering internally
    const posts = await sqliteGetPosts({
      category: filters.category,
      tags: filters.tags, // SQLite accepts tags array
      limit: limitCount,
      sortBy: 'newest', // Default sorting
    });

    // Apply client-side text search if provided
    let filteredPosts = posts;
    if (filters.searchText) {
      const searchTerm = filters.searchText.toLowerCase();
      filteredPosts = filteredPosts.filter(post =>
        post.content.toLowerCase().includes(searchTerm) ||
        post.authorName.toLowerCase().includes(searchTerm) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    console.log(`[CommunityService] Fetched ${filteredPosts.length} posts`);
    return filteredPosts;
  }

  /**
   * Get a single post by ID
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - ID of the post to fetch
   * @returns Promise with the post data
   */
  async getPost(postId: string): Promise<CommunityPost | null> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot fetch post: SQLite only available server-side');
    }

    console.log(`[CommunityService] Fetching post ${postId}...`);

    const post = await sqliteGetPostById(postId);
    if (!post) {
      console.log(`[CommunityService] Post ${postId} not found`);
      return null;
    }

    console.log(`[CommunityService] Post ${postId} fetched successfully`);
    return post;
  }

  /**
   * Update a post's like status for a user
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - ID of the post to like/unlike
   * @param userId - ID of the user performing the action
   * @param isLiking - Whether the user is liking (true) or unliking (false)
   * @returns Promise with success status
   */
  async togglePostLike(postId: string, userId: string, isLiking: boolean): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot toggle like: SQLite only available server-side');
    }

    console.log(`[CommunityService] ${isLiking ? 'Liking' : 'Unliking'} post ${postId} for user ${userId}...`);

    if (isLiking) {
      const updatedPost = await sqliteLikePost(postId, userId);
      // Check if like was actually added (likedBy array changed)
      const wasLiked = updatedPost.likedBy.includes(userId);
      console.log(`[CommunityService] ${wasLiked ? 'Liked' : 'Already liked'} post ${postId}`);
      return wasLiked;
    } else {
      const updatedPost = await sqliteUnlikePost(postId, userId);
      // Check if unlike was actually removed (likedBy array changed)
      const wasUnliked = !updatedPost.likedBy.includes(userId);
      console.log(`[CommunityService] ${wasUnliked ? 'Unliked' : 'Was not liked'} post ${postId}`);
      return wasUnliked;
    }
  }

  /**
   * Increment post view count
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - ID of the post being viewed
   * @returns Promise with success status
   */
  async incrementViewCount(postId: string): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      // Don't throw error for view count as it's not critical
      return false;
    }

    try {
      await sqliteIncrementViewCount(postId);
      // No detailed logging for view count (performance optimization)
      return true;
    } catch (error) {
      console.error(`[CommunityService] Error incrementing view count for post ${postId}:`, error);
      // Don't throw error for view count as it's not critical
      return false;
    }
  }

  /**
   * Add a comment to a post with automated content filtering
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param commentData - Data for the new comment
   * @returns Promise with the created comment ID and moderation action
   */
  async addComment(commentData: CreateCommentData): Promise<CreateContentResult> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot add comment: SQLite only available server-side');
    }

    // Apply content filtering to the comment content
    const filterResult = await contentFilterService.processContent(
      commentData.content,
      'temp-comment-id', // Temporary ID, will be replaced with actual ID
      'comment',
      commentData.authorId
    );

    // Check if content should be blocked
    if (filterResult.shouldBlock) {
      console.log(`[CommunityService] Comment creation blocked due to content violation: ${filterResult.action}`);
      throw new Error(filterResult.warningMessage || 'Your comment contains inappropriate content and cannot be published.');
    }

    // Create comment with filtered content if necessary
    const filteredCommentData = { ...commentData };
    if (filterResult.processedContent !== commentData.content) {
      filteredCommentData.content = filterResult.processedContent;
    }

    console.log(`[CommunityService] Adding comment to post ${commentData.postId}...`);

    // Generate UUID upfront for consistency with createPost()
    const commentId = randomUUID();
    const createdComment = await sqliteCreateComment({
      id: commentId,
      postId: filteredCommentData.postId,
      authorId: filteredCommentData.authorId,
      authorName: filteredCommentData.authorName,
      content: filteredCommentData.content,
      parentCommentId: filteredCommentData.parentCommentId,
      moderationAction: filterResult.action,
      originalContent: filterResult.processedContent !== commentData.content ? commentData.content : undefined,
      moderationWarning: filterResult.warningMessage || undefined,
    });

    // Update the moderation log with the actual comment ID
    if (filterResult.action !== 'allow') {
      console.log(`[CommunityService] Comment created with moderation action: ${filterResult.action}, ID: ${commentId}`);
      await contentFilterService.processContent(
        commentData.content,
        commentId,
        'comment',
        commentData.authorId
      );
    } else {
      console.log(`[CommunityService] Comment added successfully, ID: ${commentId}`);
    }

    return {
      id: commentId,
      moderationAction: filterResult.action,
    };
  }

  /**
   * Get comments for a specific post
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - ID of the post to get comments for
   * @param limitCount - Number of comments to fetch (default: 50, not used in SQLite but kept for API compatibility)
   * @returns Promise with array of comments
   */
  async getComments(postId: string, limitCount: number = 50): Promise<PostComment[]> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot fetch comments: SQLite only available server-side');
    }

    console.log(`[CommunityService] Fetching comments for post ${postId}...`);

    const comments = await sqliteGetCommentsByPost(postId);

    console.log(`[CommunityService] Fetched ${comments.length} comments for post ${postId}`);
    return comments;
  }

  /**
   * Setup real-time listener for posts
   *
   * ⚠️ **NOT AVAILABLE IN SQLITE-ONLY MODE** - Real-time updates removed with Firebase
   *
   * MIGRATION STRATEGY:
   * - This method has been removed with Firebase removal
   * - For real-time updates, implement polling using `getPosts()` method
   * - Recommended polling interval: 5-10 seconds
   * - Use React Query or similar for automatic polling
   *
   * Example polling implementation:
   * ```typescript
   * // React Query approach
   * const { data: posts } = useQuery({
   *   queryKey: ['posts', filters],
   *   queryFn: () => communityService.getPosts(filters),
   *   refetchInterval: 5000, // Poll every 5 seconds
   * });
   *
   * // Manual polling approach
   * useEffect(() => {
   *   const interval = setInterval(async () => {
   *     const posts = await communityService.getPosts(filters);
   *     setPosts(posts);
   *   }, 5000);
   *   return () => clearInterval(interval);
   * }, [filters]);
   * ```
   *
   * @deprecated Use polling with getPosts() instead
   * @param callback - Callback function to handle post updates
   * @param filters - Optional filters for posts
   * @returns Unsubscribe function (no-op in SQLite-only mode)
   */
  setupPostsListener(
    callback: (posts: CommunityPost[]) => void,
    filters: PostFilters = {}
  ): () => void {
    console.warn('[CommunityService] setupPostsListener is deprecated in SQLite-only mode. Use polling with getPosts() instead.');
    // Return no-op unsubscribe function for API compatibility
    return () => {};
  }

  /**
   * Setup real-time listener for comments
   *
   * ⚠️ **NOT AVAILABLE IN SQLITE-ONLY MODE** - Real-time updates removed with Firebase
   *
   * MIGRATION STRATEGY:
   * - This method has been removed with Firebase removal
   * - For real-time updates, implement polling using `getComments()` method
   * - Recommended polling interval: 5-10 seconds
   * - Use React Query or similar for automatic polling
   *
   * Example polling implementation:
   * ```typescript
   * // React Query approach
   * const { data: comments } = useQuery({
   *   queryKey: ['comments', postId],
   *   queryFn: () => communityService.getComments(postId),
   *   refetchInterval: 5000, // Poll every 5 seconds
   * });
   *
   * // Manual polling approach
   * useEffect(() => {
   *   const interval = setInterval(async () => {
   *     const comments = await communityService.getComments(postId);
   *     setComments(comments);
   *   }, 5000);
   *   return () => clearInterval(interval);
   * }, [postId]);
   * ```
   *
   * @deprecated Use polling with getComments() instead
   * @param postId - ID of the post to listen for comments
   * @param callback - Callback function to handle comment updates
   * @returns Unsubscribe function (no-op in SQLite-only mode)
   */
  setupCommentsListener(
    postId: string,
    callback: (comments: PostComment[]) => void
  ): () => void {
    console.warn('[CommunityService] setupCommentsListener is deprecated in SQLite-only mode. Use polling with getComments() instead.');
    // Return no-op unsubscribe function for API compatibility
    return () => {};
  }

  /**
   * Add a bookmark for a post by a user.
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - The ID of the post to bookmark
   * @param userId - The ID of the user bookmarking the post
   */
  async addBookmark(postId: string, userId: string): Promise<void> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot add bookmark: SQLite only available server-side');
    }

    console.log(`[CommunityService] Adding bookmark for post ${postId}, user ${userId}...`);

    await sqliteBookmarkPost(postId, userId);
    console.log(`[CommunityService] Bookmark added successfully`);
  }

  /**
   * Remove a bookmark for a post by a user.
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - The ID of the post to unbookmark
   * @param userId - The ID of the user removing the bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<void> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot remove bookmark: SQLite only available server-side');
    }

    console.log(`[CommunityService] Removing bookmark for post ${postId}, user ${userId}...`);

    await sqliteUnbookmarkPost(postId, userId);
    console.log(`[CommunityService] Bookmark removed successfully`);
  }

  /**
   * Get all posts bookmarked by a specific user.
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param userId - The ID of the user whose bookmarks to fetch
   * @returns Array of CommunityPost
   */
  async getBookmarkedPosts(userId: string): Promise<CommunityPost[]> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot fetch bookmarked posts: SQLite only available server-side');
    }

    console.log(`[CommunityService] Fetching bookmarked posts for user ${userId}...`);

    const posts = await sqliteGetBookmarkedPosts(userId);

    console.log(`[CommunityService] Fetched ${posts.length} bookmarked posts`);
    return posts;
  }

  /**
   * Update the status of a post (for moderation/approval).
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * Only admin or authorized users should call this method.
   * @param postId - The ID of the post to update
   * @param status - The new status ('active', 'hidden', 'deleted')
   */
  async updatePostStatus(postId: string, status: 'active' | 'hidden' | 'deleted'): Promise<void> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot update post status: SQLite only available server-side');
    }

    try {
      await sqliteUpdatePost(postId, { status });
      console.log(`[CommunityService] Post ${postId} status updated to ${status}`);
    } catch (error) {
      console.error(`[CommunityService] Error updating post status:`, error);
      throw new Error('Failed to update post status. Please try again.');
    }
  }

  /**
   * Permanently delete a post (cannot be recovered).
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - The ID of the post to delete
   */
  async deletePost(postId: string): Promise<void> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot delete post: SQLite only available server-side');
    }

    console.log(`[CommunityService] Deleting post ${postId}...`);

    await sqliteDeletePost(postId);
    console.log(`[CommunityService] Post ${postId} deleted successfully`);
  }

  /**
   * Permanently delete a comment (cannot be recovered).
   * SQLite-ONLY: Server-side only, uses SQLite repository
   * @param postId - The ID of the post containing the comment (kept for API compatibility)
   * @param commentId - The ID of the comment to delete
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[CommunityService] Cannot delete comment: SQLite only available server-side');
    }

    console.log(`[CommunityService] Deleting comment ${commentId} from post ${postId}...`);

    await sqliteDeleteComment(commentId);
    // SQLite repository handles comment count decrement automatically
    console.log(`[CommunityService] Comment ${commentId} deleted successfully`);
  }
}

// Export singleton instance
export const communityService = new CommunityService();

// Re-export utility functions from repositories for API convenience
export { buildCommentTree }; 
