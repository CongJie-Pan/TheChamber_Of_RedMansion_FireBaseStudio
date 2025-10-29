/**
 * @fileOverview Community Service with Dual-Mode Architecture (SQLite + Firebase)
 *
 * This service handles all community-related database operations including:
 * - Creating, reading, updating, and deleting forum posts
 * - Managing comments and replies on posts
 * - Handling user interactions (likes, views)
 * - Real-time updates for community engagement (Firebase only, polling for SQLite)
 * - Content moderation and validation
 *
 * DUAL-MODE ARCHITECTURE:
 * - **Primary**: SQLite (local database, fast, offline-capable)
 * - **Fallback**: Firebase Firestore (cloud database, real-time sync)
 * - Pattern: Try SQLite first, fallback to Firebase on error
 * - Logging: Each method logs which path was taken (SQLite vs Firebase)
 *
 * Database Structure:
 * - SQLite: Flat tables (posts, comments) with foreign keys
 * - Firebase: Collections (posts) with sub-collections (comments)
 *
 * Features implemented:
 * - Dual-mode data access with automatic fallback
 * - SQLite-first for performance and offline capability
 * - Firebase fallback for reliability and real-time features
 * - Content validation and sanitization
 * - Error handling and retry mechanisms
 * - Support for pagination and filtering
 * - Like/unlike functionality with user tracking
 * - Threaded comment system with nested replies
 *
 * @phase Phase 3 - SQLITE-017 - Community Service Migration
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';
import { db } from './firebase';
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

// ============================================================================
// SQLite Availability Check (with caching for performance)
// ============================================================================

/**
 * Cached SQLite availability status to avoid repeated checks
 * - null: Not yet checked
 * - true: SQLite available
 * - false: SQLite unavailable
 */
let _sqliteAvailableCache: boolean | null = null;

/**
 * Check if SQLite is available and configured
 *
 * OPTIMIZATION: Results are cached after first check to avoid repeated
 * database connection attempts on every method call.
 *
 * @returns true if SQLite is available, false otherwise
 */
function checkSQLiteAvailability(): boolean {
  // Return cached result if available
  if (_sqliteAvailableCache !== null) {
    return _sqliteAvailableCache;
  }

  // Check environment variable
  const useSQLite = process.env.USE_SQLITE === '1';
  if (!useSQLite) {
    _sqliteAvailableCache = false;
    return false;
  }

  // Additional check: Verify database connection is available
  try {
    // This will throw if database initialization failed
    const { getDatabase } = require('./sqlite-db');
    const db = getDatabase();
    const isAvailable = db !== null && db !== undefined;
    _sqliteAvailableCache = isAvailable;

    if (isAvailable) {
      console.log('✅ SQLite database available and cached for session');
    }

    return isAvailable;
  } catch (error) {
    console.error('⚠️ SQLite availability check failed:', error);
    _sqliteAvailableCache = false;
    return false;
  }
}

/**
 * Reset the SQLite availability cache
 * Useful for testing or when database connection state changes
 *
 * @internal
 */
export function resetSQLiteAvailabilityCache(): void {
  _sqliteAvailableCache = null;
  console.log('🔄 SQLite availability cache reset');
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/**
 * Convert SQLite CommunityPost to Firebase-compatible CommunityPost
 * Converts Unix timestamps back to Firestore Timestamps for API compatibility
 */
function sqlitePostToFirebasePost(sqlitePost: SQLiteCommunityPost): CommunityPost {
  return {
    ...sqlitePost,
    // Timestamps are already converted by repository layer
  } as CommunityPost;
}

/**
 * Convert SQLite Comment to Firebase-compatible PostComment
 * Converts Unix timestamps back to Firestore Timestamps for API compatibility
 */
function sqliteCommentToFirebaseComment(sqliteComment: SQLiteComment): PostComment {
  return {
    ...sqliteComment,
    // Timestamps are already converted by repository layer
  } as PostComment;
}

// Type definitions for community data structures
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags: string[];
  likes: number;
  likedBy: string[];
  commentCount: number;
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  category?: string;
  status: 'active' | 'hidden' | 'deleted';
  /**
   * Array of user IDs who have bookmarked this post.
   * Used for user-specific post collections (favorites/bookmarks).
   */
  bookmarkedBy: string[];
  /**
   * Content moderation fields for tracking filtering and review status
   */
  moderationAction?: ModerationAction;
  originalContent?: string; // Store original content before filtering
  moderationWarning?: string; // Warning message if content was filtered
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  likedBy: string[];
  parentCommentId?: string; // For nested replies
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  status: 'active' | 'hidden' | 'deleted';
  /**
   * Content moderation fields for comments
   */
  moderationAction?: ModerationAction;
  originalContent?: string;
  moderationWarning?: string;
}

export interface CreatePostData {
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags: string[];
  category?: string;
}

export interface CreateCommentData {
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
}

export interface PostFilters {
  category?: string;
  tags?: string[];
  authorId?: string;
  searchText?: string;
}

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
  private postsCollection = collection(db, 'posts');
  
  /**
   * Create a new forum post with automated content filtering
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postData - Data for the new post
   * @returns Promise with the created post ID and moderation action
   */
  async createPost(postData: CreatePostData): Promise<CreateContentResult> {
    // Apply content filtering to the post content (common for both modes)
    const contentToFilter = `${postData.title || ''} ${postData.content}`.trim();
    const filterResult = await contentFilterService.processContent(
      contentToFilter,
      'temp-post-id', // Temporary ID, will be replaced with actual ID
      'post',
      postData.authorId
    );

    // Check if content should be blocked (common for both modes)
    if (filterResult.shouldBlock) {
      console.log(`Post creation blocked due to content violation: ${filterResult.action}`);
      throw new Error(filterResult.warningMessage || 'Your post contains inappropriate content and cannot be published.');
    }

    // Create the post with filtered content if necessary (common for both modes)
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

    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log('🗄️  SQLite: Attempting to create post...');

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
          console.log(`✅ SQLite: Post created with moderation action: ${filterResult.action}, ID: ${postId}`);
          // Re-process to update the log with correct post ID
          await contentFilterService.processContent(
            contentToFilter,
            postId,
            'post',
            postData.authorId
          );
        } else {
          console.log(`✅ SQLite: Post created successfully, ID: ${postId}`);
        }

        return {
          id: postId,
          moderationAction: filterResult.action,
        };
      } catch (error) {
        console.error('❌ SQLite: Failed to create post, falling back to Firebase:', error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log('☁️  Firebase: Creating post...');

      const newPost = {
        ...filteredPostData,
        likes: 0,
        likedBy: [],
        commentCount: 0,
        viewCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isEdited: false,
        status: 'active' as const,
        /**
         * Initialize bookmarkedBy as an empty array for new posts.
         * This allows users to bookmark posts later.
         */
        bookmarkedBy: [],
        /**
         * Add content moderation fields
         */
        moderationAction: filterResult.action,
        originalContent: filterResult.processedContent !== contentToFilter ? contentToFilter : '',
        moderationWarning: filterResult.warningMessage || ''
      };

      const docRef = await addDoc(this.postsCollection, newPost);

      // Update the moderation log with the actual post ID
      if (filterResult.action !== 'allow') {
        console.log(`☁️  Firebase: Post created with moderation action: ${filterResult.action}, ID: ${docRef.id}`);
        // Re-process to update the log with correct post ID
        await contentFilterService.processContent(
          contentToFilter,
          docRef.id,
          'post',
          postData.authorId
        );
      } else {
        console.log(`☁️  Firebase: Post created successfully with ID: ${docRef.id}`);
      }

      return {
        id: docRef.id,
        moderationAction: filterResult.action
      };
    } catch (error) {
      console.error('❌ Firebase: Error creating post:', error);
      // If error message is already user-friendly (from content filter), use it directly
      if (error instanceof Error && error.message.includes('inappropriate content')) {
        throw error;
      }
      throw new Error('Failed to create post. Please try again.');
    }
  }

  /**
   * Get all posts with optional filtering and pagination
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param filters - Optional filters for posts
   * @param limitCount - Number of posts to fetch (default: 20)
   * @param lastDoc - Last document for pagination (Firebase only, ignored for SQLite)
   * @returns Promise with array of posts
   */
  async getPosts(
    filters: PostFilters = {},
    limitCount: number = 20,
    lastDoc?: any
  ): Promise<CommunityPost[]> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log('🗄️  SQLite: Fetching posts with filters:', filters);

        // SQLite repository handles filtering internally
        const posts = await sqliteGetPosts({
          category: filters.category,
          tags: filters.tags, // SQLite accepts tags array
          limit: limitCount,
          sortBy: 'newest', // Default sorting
        });

        // Apply client-side text search if provided (same as Firebase)
        let filteredPosts = posts.map(sqlitePostToFirebasePost);
        if (filters.searchText) {
          const searchTerm = filters.searchText.toLowerCase();
          filteredPosts = filteredPosts.filter(post =>
            post.content.toLowerCase().includes(searchTerm) ||
            post.authorName.toLowerCase().includes(searchTerm) ||
            post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        }

        console.log(`✅ SQLite: Fetched ${filteredPosts.length} posts`);
        return filteredPosts;
      } catch (error) {
        console.error('❌ SQLite: Failed to fetch posts, falling back to Firebase:', error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log('☁️  Firebase: Fetching posts with filters:', filters);

      let postsQuery = query(
        this.postsCollection,
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      // Add filters
      if (filters.category) {
        postsQuery = query(postsQuery, where('category', '==', filters.category));
      }

      if (filters.authorId) {
        postsQuery = query(postsQuery, where('authorId', '==', filters.authorId));
      }

      // Add pagination
      if (lastDoc) {
        postsQuery = query(postsQuery, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(postsQuery);
      const posts: CommunityPost[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        } as CommunityPost);
      });

      // Apply text search filter on client side (for better performance with small datasets)
      if (filters.searchText) {
        const searchTerm = filters.searchText.toLowerCase();
        const filteredPosts = posts.filter(post =>
          post.content.toLowerCase().includes(searchTerm) ||
          post.authorName.toLowerCase().includes(searchTerm) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        console.log(`☁️  Firebase: Fetched ${filteredPosts.length} posts (after text search)`);
        return filteredPosts;
      }

      console.log(`☁️  Firebase: Fetched ${posts.length} posts`);
      return posts;
    } catch (error) {
      console.error('❌ Firebase: Error fetching posts:', error);
      throw new Error('Failed to fetch posts. Please try again.');
    }
  }

  /**
   * Get a single post by ID
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - ID of the post to fetch
   * @returns Promise with the post data
   */
  async getPost(postId: string): Promise<CommunityPost | null> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Fetching post ${postId}...`);

        const post = await sqliteGetPostById(postId);
        if (!post) {
          console.log(`ℹ️  SQLite: Post ${postId} not found`);
          return null;
        }

        console.log(`✅ SQLite: Post ${postId} fetched successfully`);
        return sqlitePostToFirebasePost(post);
      } catch (error) {
        console.error(`❌ SQLite: Failed to fetch post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Fetching post ${postId}...`);

      const postDoc = await getDoc(doc(this.postsCollection, postId));

      if (!postDoc.exists()) {
        console.log(`ℹ️  Firebase: Post ${postId} not found`);
        return null;
      }

      const data = postDoc.data();
      console.log(`☁️  Firebase: Post ${postId} fetched successfully`);
      return {
        id: postDoc.id,
        ...data,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now()
      } as CommunityPost;
    } catch (error) {
      console.error(`❌ Firebase: Error fetching post ${postId}:`, error);
      throw new Error('Failed to fetch post. Please try again.');
    }
  }

  /**
   * Update a post's like status for a user
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - ID of the post to like/unlike
   * @param userId - ID of the user performing the action
   * @param isLiking - Whether the user is liking (true) or unliking (false)
   * @returns Promise with success status
   */
  async togglePostLike(postId: string, userId: string, isLiking: boolean): Promise<boolean> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: ${isLiking ? 'Liking' : 'Unliking'} post ${postId} for user ${userId}...`);

        if (isLiking) {
          const updatedPost = await sqliteLikePost(postId, userId);
          // Check if like was actually added (likedBy array changed)
          const wasLiked = updatedPost.likedBy.includes(userId);
          console.log(`✅ SQLite: ${wasLiked ? 'Liked' : 'Already liked'} post ${postId}`);
          return wasLiked;
        } else {
          const updatedPost = await sqliteUnlikePost(postId, userId);
          // Check if unlike was actually removed (likedBy array changed)
          const wasUnliked = !updatedPost.likedBy.includes(userId);
          console.log(`✅ SQLite: ${wasUnliked ? 'Unliked' : 'Was not liked'} post ${postId}`);
          return wasUnliked;
        }
      } catch (error) {
        console.error(`❌ SQLite: Failed to toggle like for post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: ${isLiking ? 'Liking' : 'Unliking'} post ${postId} for user ${userId}...`);

      const postRef = doc(this.postsCollection, postId);

      const changed = await runTransaction(db, async (tx) => {
        const snap = await tx.get(postRef as any);
        if (!snap.exists()) {
          throw new Error('Post not found');
        }

        const data = snap.data() as any;
        const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
        const isCurrentlyLiked = likedBy.includes(userId);

        if (isLiking) {
          // Only add like if not already liked by this user
          if (!isCurrentlyLiked) {
            tx.update(postRef as any, {
              likes: increment(1),
              likedBy: arrayUnion(userId),
              updatedAt: serverTimestamp(),
            });
            return true;
          }
          return false;
        } else {
          // Only remove like if currently liked by this user
          if (isCurrentlyLiked) {
            tx.update(postRef as any, {
              likes: increment(-1),
              likedBy: arrayRemove(userId),
              updatedAt: serverTimestamp(),
            });
            return true;
          }
          return false;
        }
      });

      console.log(`☁️  Firebase: ${changed ? 'Successfully toggled like' : 'No change'} for post ${postId}`);
      return changed;
    } catch (error) {
      console.error(`❌ Firebase: Error toggling post like for ${postId}:`, error);
      throw new Error('Failed to update like status. Please try again.');
    }
  }

  /**
   * Increment post view count
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - ID of the post being viewed
   * @returns Promise with success status
   */
  async incrementViewCount(postId: string): Promise<boolean> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        await sqliteIncrementViewCount(postId);
        // No detailed logging for view count (performance optimization)
        return true;
      } catch (error) {
        console.error(`❌ SQLite: Failed to increment view count for post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error(`❌ Firebase: Error incrementing view count for post ${postId}:`, error);
      // Don't throw error for view count as it's not critical
      return false;
    }
  }

  /**
   * Add a comment to a post with automated content filtering
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param commentData - Data for the new comment
   * @returns Promise with the created comment ID and moderation action
   */
  async addComment(commentData: CreateCommentData): Promise<CreateContentResult> {
    // Apply content filtering to the comment content (common for both modes)
    const filterResult = await contentFilterService.processContent(
      commentData.content,
      'temp-comment-id', // Temporary ID, will be replaced with actual ID
      'comment',
      commentData.authorId
    );

    // Check if content should be blocked (common for both modes)
    if (filterResult.shouldBlock) {
      console.log(`Comment creation blocked due to content violation: ${filterResult.action}`);
      throw new Error(filterResult.warningMessage || 'Your comment contains inappropriate content and cannot be published.');
    }

    // Create comment with filtered content if necessary (common for both modes)
    const filteredCommentData = { ...commentData };
    if (filterResult.processedContent !== commentData.content) {
      filteredCommentData.content = filterResult.processedContent;
    }

    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Adding comment to post ${commentData.postId}...`);

        // OPTIMIZATION: Generate UUID upfront for consistency with createPost()
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
          console.log(`✅ SQLite: Comment created with moderation action: ${filterResult.action}, ID: ${commentId}`);
          await contentFilterService.processContent(
            commentData.content,
            commentId,
            'comment',
            commentData.authorId
          );
        } else {
          console.log(`✅ SQLite: Comment added successfully, ID: ${commentId}`);
        }

        return {
          id: commentId,
          moderationAction: filterResult.action,
        };
      } catch (error) {
        console.error(`❌ SQLite: Failed to add comment to post ${commentData.postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Adding comment to post ${commentData.postId}...`);

      const commentsCollection = collection(db, 'posts', commentData.postId, 'comments');

      const newComment = {
        ...filteredCommentData,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isEdited: false,
        status: 'active' as const,
        /**
         * Add content moderation fields
         */
        moderationAction: filterResult.action,
        originalContent: filterResult.processedContent !== commentData.content ? commentData.content : '',
        moderationWarning: filterResult.warningMessage || ''
      };

      const docRef = await addDoc(commentsCollection, newComment);

      // Update the moderation log with the actual comment ID
      if (filterResult.action !== 'allow') {
        console.log(`☁️  Firebase: Comment created with moderation action: ${filterResult.action}, ID: ${docRef.id}`);
        await contentFilterService.processContent(
          commentData.content,
          docRef.id,
          'comment',
          commentData.authorId
        );
      } else {
        console.log(`☁️  Firebase: Comment added successfully with ID: ${docRef.id}`);
      }

      // Update comment count on the parent post
      const postRef = doc(this.postsCollection, commentData.postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        moderationAction: filterResult.action
      };
    } catch (error) {
      console.error(`❌ Firebase: Error adding comment to post ${commentData.postId}:`, error);
      // If error message is already user-friendly (from content filter), use it directly
      if (error instanceof Error && error.message.includes('inappropriate content')) {
        throw error;
      }
      throw new Error('Failed to add comment. Please try again.');
    }
  }

  /**
   * Get comments for a specific post
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - ID of the post to get comments for
   * @param limitCount - Number of comments to fetch (default: 50)
   * @returns Promise with array of comments
   */
  async getComments(postId: string, limitCount: number = 50): Promise<PostComment[]> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Fetching comments for post ${postId}...`);

        const comments = await sqliteGetCommentsByPost(postId);

        // SQLite already returns comments with proper structure
        // Convert SQLite comments to Firebase-compatible format
        const formattedComments = comments.map(sqliteCommentToFirebaseComment);

        console.log(`✅ SQLite: Fetched ${formattedComments.length} comments for post ${postId}`);
        return formattedComments;
      } catch (error) {
        console.error(`❌ SQLite: Failed to fetch comments for post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Fetching comments for post ${postId}...`);

      const commentsCollection = collection(db, 'posts', postId, 'comments');
      const commentsQuery = query(
        commentsCollection,
        where('status', '==', 'active'),
        orderBy('createdAt', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(commentsQuery);
      const comments: PostComment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          postId,
          ...data,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        } as PostComment);
      });

      console.log(`☁️  Firebase: Fetched ${comments.length} comments for post ${postId}`);
      return comments;
    } catch (error) {
      console.error(`❌ Firebase: Error fetching comments for post ${postId}:`, error);
      throw new Error('Failed to fetch comments. Please try again.');
    }
  }

  /**
   * Setup real-time listener for posts
   *
   * ⚠️ **FIREBASE ONLY** - Real-time updates not available with SQLite
   *
   * MIGRATION STRATEGY:
   * - This method only works with Firebase (onSnapshot)
   * - For SQLite mode, implement polling using `getPosts()` method
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
   * @param callback - Callback function to handle post updates
   * @param filters - Optional filters for posts
   * @returns Unsubscribe function (Firebase only)
   */
  setupPostsListener(
    callback: (posts: CommunityPost[]) => void,
    filters: PostFilters = {}
  ): () => void {
    let postsQuery = query(
      this.postsCollection,
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    // Add filters
    if (filters.category) {
      postsQuery = query(postsQuery, where('category', '==', filters.category));
    }

    return onSnapshot(postsQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const posts: CommunityPost[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        } as CommunityPost);
      });

      callback(posts);
    }, (error: Error) => {
      console.error('Error in posts listener:', error);
    });
  }

  /**
   * Setup real-time listener for comments
   *
   * ⚠️ **FIREBASE ONLY** - Real-time updates not available with SQLite
   *
   * MIGRATION STRATEGY:
   * - This method only works with Firebase (onSnapshot)
   * - For SQLite mode, implement polling using `getComments()` method
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
   * @param postId - ID of the post to listen for comments
   * @param callback - Callback function to handle comment updates
   * @returns Unsubscribe function (Firebase only)
   */
  setupCommentsListener(
    postId: string,
    callback: (comments: PostComment[]) => void
  ): () => void {
    const commentsCollection = collection(db, 'posts', postId, 'comments');
    const commentsQuery = query(
      commentsCollection,
      where('status', '==', 'active'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(commentsQuery, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const comments: PostComment[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          postId,
          ...data,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        } as PostComment);
      });

      callback(comments);
    }, (error: Error) => {
      console.error('Error in comments listener:', error);
    });
  }

  /**
   * Add a bookmark for a post by a user.
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - The ID of the post to bookmark
   * @param userId - The ID of the user bookmarking the post
   */
  async addBookmark(postId: string, userId: string): Promise<void> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Adding bookmark for post ${postId}, user ${userId}...`);

        await sqliteBookmarkPost(postId, userId);
        console.log(`✅ SQLite: Bookmark added successfully`);
        return;
      } catch (error) {
        console.error(`❌ SQLite: Failed to add bookmark for post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Adding bookmark for post ${postId}, user ${userId}...`);

      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        bookmarkedBy: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      console.log(`☁️  Firebase: Bookmark added successfully`);
    } catch (error) {
      console.error(`❌ Firebase: Error adding bookmark for post ${postId}:`, error);
      throw new Error('Failed to add bookmark. Please try again.');
    }
  }

  /**
   * Remove a bookmark for a post by a user.
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - The ID of the post to unbookmark
   * @param userId - The ID of the user removing the bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<void> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Removing bookmark for post ${postId}, user ${userId}...`);

        await sqliteUnbookmarkPost(postId, userId);
        console.log(`✅ SQLite: Bookmark removed successfully`);
        return;
      } catch (error) {
        console.error(`❌ SQLite: Failed to remove bookmark for post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Removing bookmark for post ${postId}, user ${userId}...`);

      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        bookmarkedBy: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      console.log(`☁️  Firebase: Bookmark removed successfully`);
    } catch (error) {
      console.error(`❌ Firebase: Error removing bookmark for post ${postId}:`, error);
      throw new Error('Failed to remove bookmark. Please try again.');
    }
  }

  /**
   * Get all posts bookmarked by a specific user.
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param userId - The ID of the user whose bookmarks to fetch
   * @returns Array of CommunityPost
   */
  async getBookmarkedPosts(userId: string): Promise<CommunityPost[]> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Fetching bookmarked posts for user ${userId}...`);

        const posts = await sqliteGetBookmarkedPosts(userId);
        const formattedPosts = posts.map(sqlitePostToFirebasePost);

        console.log(`✅ SQLite: Fetched ${formattedPosts.length} bookmarked posts`);
        return formattedPosts;
      } catch (error) {
        console.error(`❌ SQLite: Failed to fetch bookmarked posts for user ${userId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Fetching bookmarked posts for user ${userId}...`);

      const postsQuery = query(
        this.postsCollection,
        where('bookmarkedBy', 'array-contains', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(postsQuery);
      const posts: CommunityPost[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt || Timestamp.now()
        } as CommunityPost);
      });

      console.log(`☁️  Firebase: Fetched ${posts.length} bookmarked posts`);
      return posts;
    } catch (error) {
      console.error(`❌ Firebase: Error fetching bookmarked posts for user ${userId}:`, error);
      throw new Error('Failed to fetch bookmarked posts. Please try again.');
    }
  }

  /**
   * Update the status of a post (for moderation/approval).
   * Only admin or authorized users should call this method.
   * @param postId - The ID of the post to update
   * @param status - The new status ('active', 'hidden', 'deleted')
   */
  async updatePostStatus(postId: string, status: 'active' | 'hidden' | 'deleted'): Promise<void> {
    try {
      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating post status:', error);
      throw new Error('Failed to update post status. Please try again.');
    }
  }

  /**
   * Permanently delete a post (cannot be recovered).
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - The ID of the post to delete
   */
  async deletePost(postId: string): Promise<void> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Deleting post ${postId}...`);

        await sqliteDeletePost(postId);
        console.log(`✅ SQLite: Post ${postId} deleted successfully`);
        return;
      } catch (error) {
        console.error(`❌ SQLite: Failed to delete post ${postId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Deleting post ${postId}...`);

      const postRef = doc(this.postsCollection, postId);
      await deleteDoc(postRef);
      console.log(`☁️  Firebase: Post ${postId} deleted successfully`);
      // Note: This does NOT delete sub-collections (e.g., comments) automatically.
      // If you want to also delete all comments, you need to recursively delete them.
    } catch (error) {
      console.error(`❌ Firebase: Error deleting post ${postId}:`, error);
      throw new Error('Failed to delete post. Please try again.');
    }
  }

  /**
   * Permanently delete a comment (cannot be recovered).
   * DUAL-MODE: SQLite primary, Firebase fallback
   * @param postId - The ID of the post containing the comment
   * @param commentId - The ID of the comment to delete
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    // ========================================================================
    // Try SQLite first (PRIMARY PATH)
    // ========================================================================
    if (checkSQLiteAvailability()) {
      try {
        console.log(`🗄️  SQLite: Deleting comment ${commentId} from post ${postId}...`);

        await sqliteDeleteComment(commentId);
        // SQLite repository handles comment count decrement automatically
        console.log(`✅ SQLite: Comment ${commentId} deleted successfully`);
        return;
      } catch (error) {
        console.error(`❌ SQLite: Failed to delete comment ${commentId}, falling back to Firebase:`, error);
        // Fall through to Firebase fallback below
      }
    }

    // ========================================================================
    // Firebase fallback (FALLBACK PATH)
    // ========================================================================
    try {
      console.log(`☁️  Firebase: Deleting comment ${commentId} from post ${postId}...`);

      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      await deleteDoc(commentRef);

      // After deleting the comment, decrement the commentCount on the parent post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1),
        updatedAt: serverTimestamp()
      });

      console.log(`☁️  Firebase: Comment ${commentId} deleted successfully`);
    } catch (error) {
      console.error(`❌ Firebase: Error deleting comment ${commentId}:`, error);
      throw new Error('Failed to delete comment. Please try again.');
    }
  }
}

// Export singleton instance
export const communityService = new CommunityService(); 
