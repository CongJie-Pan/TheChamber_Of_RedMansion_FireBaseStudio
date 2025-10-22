/**
 * @fileOverview Community Service for Firebase Firestore Operations
 * 
 * This service handles all community-related database operations including:
 * - Creating, reading, updating, and deleting forum posts
 * - Managing comments and replies on posts
 * - Handling user interactions (likes, views)
 * - Real-time updates for community engagement
 * - Content moderation and validation
 * 
 * Database Structure:
 * - posts: Main forum posts collection
 * - comments: Sub-collection under each post for threaded discussions
 * - users: User profiles and authentication data
 * - categories: Post categorization system
 * 
 * Features implemented:
 * - Real-time data synchronization with Firestore
 * - Optimistic UI updates for better user experience
 * - Content validation and sanitization
 * - Error handling and retry mechanisms
 * - Support for pagination and infinite scrolling
 * - Like/unlike functionality with user tracking
 * - Threaded comment system with nested replies
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
   * @param postData - Data for the new post
   * @returns Promise with the created post ID and moderation action
   */
  async createPost(postData: CreatePostData): Promise<CreateContentResult> {
    try {
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
        console.log(`Post creation blocked due to content violation: ${filterResult.action}`);
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
        console.log(`Post created with moderation action: ${filterResult.action}, ID: ${docRef.id}`);
        // Re-process to update the log with correct post ID
        await contentFilterService.processContent(
          contentToFilter,
          docRef.id,
          'post',
          postData.authorId
        );
      }

      console.log('Post created successfully with ID:', docRef.id);
      return {
        id: docRef.id,
        moderationAction: filterResult.action
      };
    } catch (error) {
      console.error('Error creating post:', error);
      // If error message is already user-friendly (from content filter), use it directly
      if (error instanceof Error && error.message.includes('inappropriate content')) {
        throw error;
      }
      throw new Error('Failed to create post. Please try again.');
    }
  }

  /**
   * Get all posts with optional filtering and pagination
   * @param filters - Optional filters for posts
   * @param limitCount - Number of posts to fetch (default: 20)
   * @param lastDoc - Last document for pagination
   * @returns Promise with array of posts
   */
  async getPosts(
    filters: PostFilters = {}, 
    limitCount: number = 20,
    lastDoc?: any
  ): Promise<CommunityPost[]> {
    try {
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
        return posts.filter(post => 
          post.content.toLowerCase().includes(searchTerm) ||
          post.authorName.toLowerCase().includes(searchTerm) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      return posts;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw new Error('Failed to fetch posts. Please try again.');
    }
  }

  /**
   * Get a single post by ID
   * @param postId - ID of the post to fetch
   * @returns Promise with the post data
   */
  async getPost(postId: string): Promise<CommunityPost | null> {
    try {
      const postDoc = await getDoc(doc(this.postsCollection, postId));
      
      if (!postDoc.exists()) {
        return null;
      }

      const data = postDoc.data();
      return {
        id: postDoc.id,
        ...data,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now()
      } as CommunityPost;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw new Error('Failed to fetch post. Please try again.');
    }
  }

  /**
   * Update a post's like status for a user
   * @param postId - ID of the post to like/unlike
   * @param userId - ID of the user performing the action
   * @param isLiking - Whether the user is liking (true) or unliking (false)
   * @returns Promise with success status
   */
  async togglePostLike(postId: string, userId: string, isLiking: boolean): Promise<boolean> {
    try {
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

      return changed;
    } catch (error) {
      console.error('Error toggling post like:', error);
      throw new Error('Failed to update like status. Please try again.');
    }
  }

  /**
   * Increment post view count
   * @param postId - ID of the post being viewed
   * @returns Promise with success status
   */
  async incrementViewCount(postId: string): Promise<boolean> {
    try {
      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        viewCount: increment(1),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't throw error for view count as it's not critical
      return false;
    }
  }

  /**
   * Add a comment to a post with automated content filtering
   * @param commentData - Data for the new comment
   * @returns Promise with the created comment ID and moderation action
   */
  async addComment(commentData: CreateCommentData): Promise<CreateContentResult> {
    try {
      // Apply content filtering to the comment content
      const filterResult = await contentFilterService.processContent(
        commentData.content,
        'temp-comment-id', // Temporary ID, will be replaced with actual ID
        'comment',
        commentData.authorId
      );

      // Check if content should be blocked
      if (filterResult.shouldBlock) {
        console.log(`Comment creation blocked due to content violation: ${filterResult.action}`);
        throw new Error(filterResult.warningMessage || 'Your comment contains inappropriate content and cannot be published.');
      }

      const commentsCollection = collection(db, 'posts', commentData.postId, 'comments');
      
      // Create comment with filtered content if necessary
      const filteredCommentData = { ...commentData };
      if (filterResult.processedContent !== commentData.content) {
        filteredCommentData.content = filterResult.processedContent;
      }
      
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
        console.log(`Comment created with moderation action: ${filterResult.action}, ID: ${docRef.id}`);
        // Re-process to update the log with correct comment ID
        await contentFilterService.processContent(
          commentData.content,
          docRef.id,
          'comment',
          commentData.authorId
        );
      }

      // Update comment count on the parent post
      const postRef = doc(this.postsCollection, commentData.postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
        updatedAt: serverTimestamp()
      });

      console.log('Comment added successfully with ID:', docRef.id);
      return {
        id: docRef.id,
        moderationAction: filterResult.action
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      // If error message is already user-friendly (from content filter), use it directly
      if (error instanceof Error && error.message.includes('inappropriate content')) {
        throw error;
      }
      throw new Error('Failed to add comment. Please try again.');
    }
  }

  /**
   * Get comments for a specific post
   * @param postId - ID of the post to get comments for
   * @param limitCount - Number of comments to fetch (default: 50)
   * @returns Promise with array of comments
   */
  async getComments(postId: string, limitCount: number = 50): Promise<PostComment[]> {
    try {
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

      return comments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments. Please try again.');
    }
  }

  /**
   * Setup real-time listener for posts
   * @param callback - Callback function to handle post updates
   * @param filters - Optional filters for posts
   * @returns Unsubscribe function
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
   * @param postId - ID of the post to listen for comments
   * @param callback - Callback function to handle comment updates
   * @returns Unsubscribe function
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
   * This will add the user's ID to the post's bookmarkedBy array.
   * @param postId - The ID of the post to bookmark
   * @param userId - The ID of the user bookmarking the post
   */
  async addBookmark(postId: string, userId: string): Promise<void> {
    try {
      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        bookmarkedBy: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw new Error('Failed to add bookmark. Please try again.');
    }
  }

  /**
   * Remove a bookmark for a post by a user.
   * This will remove the user's ID from the post's bookmarkedBy array.
   * @param postId - The ID of the post to unbookmark
   * @param userId - The ID of the user removing the bookmark
   */
  async removeBookmark(postId: string, userId: string): Promise<void> {
    try {
      const postRef = doc(this.postsCollection, postId);
      await updateDoc(postRef, {
        bookmarkedBy: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      throw new Error('Failed to remove bookmark. Please try again.');
    }
  }

  /**
   * Get all posts bookmarked by a specific user.
   * This queries posts where bookmarkedBy array contains the userId.
   * @param userId - The ID of the user whose bookmarks to fetch
   * @returns Array of CommunityPost
   */
  async getBookmarkedPosts(userId: string): Promise<CommunityPost[]> {
    try {
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
      return posts;
    } catch (error) {
      console.error('Error fetching bookmarked posts:', error);
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
   * Permanently delete a post from Firestore (cannot be recovered).
   * This will remove the post document entirely from the 'posts' collection.
   * @param postId - The ID of the post to delete
   */
  async deletePost(postId: string): Promise<void> {
    try {
      const postRef = doc(this.postsCollection, postId);
      await deleteDoc(postRef);
      // Note: This does NOT delete sub-collections (e.g., comments) automatically.
      // If you want to also delete all comments, you need to recursively delete them.
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error('Failed to delete post. Please try again.');
    }
  }

  /**
   * Permanently delete a comment from Firestore (cannot be recovered).
   * This will remove the comment document entirely from the 'comments' sub-collection under the specified post.
   * @param postId - The ID of the post containing the comment
   * @param commentId - The ID of the comment to delete
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    try {
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      await deleteDoc(commentRef);
      // After deleting the comment, decrement the commentCount on the parent post
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('Failed to delete comment. Please try again.');
    }
  }
}

// Export singleton instance
export const communityService = new CommunityService(); 
