/**
 * @fileOverview Community Repository for SQLite Database
 *
 * This module provides CRUD operations for community posts using SQLite,
 * replacing Firebase Firestore community operations.
 *
 * Features:
 * - Post CRUD operations (create, read, update, delete)
 * - Post interactions (like, bookmark, view count)
 * - Post queries (by author, tag, category, trending)
 * - Content moderation integration
 *
 * @phase Phase 3 - SQLITE-014 Community Repository Implementation
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { ModerationAction } from '../content-filter-service';

/**
 * Timestamp-like type for date fields (SQLITE-025: Firebase removed)
 * Matches the return type of fromUnixTimestamp()
 */
type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toMillis: () => number;
  toDate: () => Date;
  isEqual: (other: any) => boolean;
};

/**
 * Post data interface for database operations
 */
export interface PostRow {
  id: string;
  authorId: string;
  authorName: string;
  title: string | null;
  content: string;
  tags: string; // JSON array
  category: string | null;
  likes: number;
  likedBy: string; // JSON array of userIds
  bookmarkedBy: string; // JSON array of userIds
  commentCount: number;
  viewCount: number;
  status: 'active' | 'hidden' | 'deleted';
  isEdited: number; // 0 or 1 (boolean)
  moderationAction: string | null;
  originalContent: string | null;
  moderationWarning: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Post interface matching community-service.ts
 */
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
  bookmarkedBy: string[];
  moderationAction?: ModerationAction;
  originalContent?: string;
  moderationWarning?: string;
}

/**
 * Convert database row to CommunityPost
 */
function rowToPost(row: PostRow): CommunityPost {
  return {
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName,
    title: row.title || undefined,
    content: row.content,
    tags: row.tags ? JSON.parse(row.tags) : [],
    category: row.category || undefined,
    likes: row.likes,
    likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
    bookmarkedBy: row.bookmarkedBy ? JSON.parse(row.bookmarkedBy) : [],
    commentCount: row.commentCount,
    viewCount: row.viewCount,
    status: row.status,
    isEdited: row.isEdited === 1,
    // Fixed: Handle both string and JSON format for moderationAction
    moderationAction: row.moderationAction ?
      (typeof row.moderationAction === 'string' &&
       (row.moderationAction === 'allow' ||
        row.moderationAction === 'warn' ||
        row.moderationAction === 'filter')
         ? row.moderationAction
         : JSON.parse(row.moderationAction))
      : undefined,
    originalContent: row.originalContent || undefined,
    moderationWarning: row.moderationWarning || undefined,
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.updatedAt),
  };
}

// ============================================================================
// A. Basic Post CRUD Operations (6 functions)
// ============================================================================

/**
 * Create a new post
 * Note: Content moderation should be performed at the service layer before calling this function
 *
 * @param post - Post data (content should already be moderated)
 * @returns Created post ID
 */
export function createPost(post: {
  id: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags?: string[];
  category?: string;
  status?: 'active' | 'hidden' | 'deleted';
  moderationAction?: string;
  originalContent?: string;
  moderationWarning?: string;
}): string {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO posts (
      id, authorId, authorName, title, content, tags, category,
      likes, likedBy, bookmarkedBy, commentCount, viewCount,
      status, isEdited, moderationAction, originalContent, moderationWarning,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    post.id,
    post.authorId,
    post.authorName,
    post.title || null,
    post.content,
    JSON.stringify(post.tags || []),
    post.category || null,
    0, // likes
    JSON.stringify([]), // likedBy
    JSON.stringify([]), // bookmarkedBy
    0, // commentCount
    0, // viewCount
    post.status || 'active',
    0, // isEdited
    post.moderationAction || null,
    post.originalContent || null,
    post.moderationWarning || null,
    now,
    now
  );

  console.log(`✅ [CommunityRepository] Created post: ${post.id}`);
  return post.id;
}

/**
 * Get post by ID
 *
 * @param postId - Post ID
 * @returns Post or null if not found
 */
export function getPostById(postId: string): CommunityPost | null {
  const db = getDatabase();

  const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
  const row = stmt.get(postId) as PostRow | undefined;

  return row ? rowToPost(row) : null;
}

/**
 * Get posts with filters and pagination
 *
 * @param options - Query options
 * @returns Array of posts
 */
export function getPosts(options: {
  category?: string;
  status?: 'active' | 'hidden' | 'deleted';
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'popular' | 'trending';
} = {}): CommunityPost[] {
  const db = getDatabase();

  const {
    category,
    status = 'active',
    tags,
    limit = 20,
    offset = 0,
    sortBy = 'newest'
  } = options;

  let query = 'SELECT * FROM posts WHERE status = ?';
  const params: any[] = [status];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (tags && tags.length > 0) {
    // Filter by tags (JSON array contains)
    const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
    query += ` AND (${tagConditions})`;
    tags.forEach(tag => params.push(`%"${tag}"%`));
  }

  // Sorting
  if (sortBy === 'newest') {
    query += ' ORDER BY createdAt DESC';
  } else if (sortBy === 'popular') {
    query += ' ORDER BY likes DESC, commentCount DESC, viewCount DESC';
  } else if (sortBy === 'trending') {
    // Trending score: (likes * 2 + commentCount * 3 + viewCount) / age_in_hours
    query += ' ORDER BY (likes * 2 + commentCount * 3 + viewCount) / ((? - createdAt) / 3600000.0 + 1) DESC';
    params.push(Date.now());
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Update post
 * Note: Content moderation should be performed at the service layer before calling this function
 *
 * @param postId - Post ID
 * @param updates - Fields to update (content should already be moderated if changed)
 * @returns Updated post
 */
export function updatePost(
  postId: string,
  updates: Partial<{
    title: string;
    content: string;
    tags: string[];
    category: string;
    status: 'active' | 'hidden' | 'deleted';
    moderationAction: string;
    originalContent: string;
    moderationWarning: string;
  }>
): CommunityPost {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const params: any[] = [];

  if (updates.title !== undefined) {
    fields.push('title = ?');
    params.push(updates.title || null);
  }

  if (updates.content !== undefined) {
    fields.push('content = ?');
    params.push(updates.content);

    fields.push('isEdited = ?');
    params.push(1);
  }

  if (updates.moderationAction !== undefined) {
    fields.push('moderationAction = ?');
    params.push(updates.moderationAction || null);
  }

  if (updates.originalContent !== undefined) {
    fields.push('originalContent = ?');
    params.push(updates.originalContent || null);
  }

  if (updates.moderationWarning !== undefined) {
    fields.push('moderationWarning = ?');
    params.push(updates.moderationWarning || null);
  }

  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    params.push(JSON.stringify(updates.tags));
  }

  if (updates.category !== undefined) {
    fields.push('category = ?');
    params.push(updates.category || null);
  }

  if (updates.status !== undefined) {
    fields.push('status = ?');
    params.push(updates.status);
  }

  fields.push('updatedAt = ?');
  params.push(now);

  params.push(postId);

  const stmt = db.prepare(`
    UPDATE posts SET ${fields.join(', ')} WHERE id = ?
  `);
  stmt.run(...params);

  console.log(`✅ [CommunityRepository] Updated post: ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after update: ${postId}`);
  return updated;
}

/**
 * Delete post (soft delete)
 *
 * @param postId - Post ID
 */
export function deletePost(postId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE posts SET status = 'deleted', updatedAt = ? WHERE id = ?
  `);
  stmt.run(Date.now(), postId);

  console.log(`✅ [CommunityRepository] Deleted post: ${postId}`);
}

/**
 * Check if post exists
 *
 * @param postId - Post ID
 * @returns True if post exists
 */
export function postExists(postId: string): boolean {
  const db = getDatabase();

  const stmt = db.prepare('SELECT 1 FROM posts WHERE id = ? LIMIT 1');
  const row = stmt.get(postId);

  return !!row;
}

// ============================================================================
// B. Post Interactions (5 functions)
// ============================================================================

/**
 * Like a post
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Updated post
 */
export function likePost(postId: string, userId: string): CommunityPost {
  const db = getDatabase();

  const post = getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (post.likedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} already liked post ${postId}`);
    return post;
  }

  const newLikedBy = [...post.likedBy, userId];

  const stmt = db.prepare(`
    UPDATE posts
    SET likes = likes + 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(newLikedBy), Date.now(), postId);

  console.log(`✅ [CommunityRepository] User ${userId} liked post ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after like: ${postId}`);
  return updated;
}

/**
 * Unlike a post
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Updated post
 */
export function unlikePost(postId: string, userId: string): CommunityPost {
  const db = getDatabase();

  const post = getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (!post.likedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} hasn't liked post ${postId}`);
    return post;
  }

  const newLikedBy = post.likedBy.filter(id => id !== userId);

  const stmt = db.prepare(`
    UPDATE posts
    SET likes = likes - 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(newLikedBy), Date.now(), postId);

  console.log(`✅ [CommunityRepository] User ${userId} unliked post ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after unlike: ${postId}`);
  return updated;
}

/**
 * Bookmark a post
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Updated post
 */
export function bookmarkPost(postId: string, userId: string): CommunityPost {
  const db = getDatabase();

  const post = getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (post.bookmarkedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} already bookmarked post ${postId}`);
    return post;
  }

  const newBookmarkedBy = [...post.bookmarkedBy, userId];

  const stmt = db.prepare(`
    UPDATE posts
    SET bookmarkedBy = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(newBookmarkedBy), Date.now(), postId);

  console.log(`✅ [CommunityRepository] User ${userId} bookmarked post ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after bookmark: ${postId}`);
  return updated;
}

/**
 * Unbookmark a post
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Updated post
 */
export function unbookmarkPost(postId: string, userId: string): CommunityPost {
  const db = getDatabase();

  const post = getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (!post.bookmarkedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} hasn't bookmarked post ${postId}`);
    return post;
  }

  const newBookmarkedBy = post.bookmarkedBy.filter(id => id !== userId);

  const stmt = db.prepare(`
    UPDATE posts
    SET bookmarkedBy = ?, updatedAt = ?
    WHERE id = ?
  `);
  stmt.run(JSON.stringify(newBookmarkedBy), Date.now(), postId);

  console.log(`✅ [CommunityRepository] User ${userId} unbookmarked post ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after unbookmark: ${postId}`);
  return updated;
}

/**
 * Increment post view count
 *
 * @param postId - Post ID
 */
export function incrementViewCount(postId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE posts SET viewCount = viewCount + 1 WHERE id = ?
  `);
  stmt.run(postId);
}

// ============================================================================
// C. Post Queries (5 functions)
// ============================================================================

/**
 * Get posts by author
 *
 * @param authorId - Author user ID
 * @param limit - Maximum number of posts
 * @returns Array of posts
 */
export function getPostsByAuthor(authorId: string, limit: number = 20): CommunityPost[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE authorId = ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `);
  const rows = stmt.all(authorId, limit) as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get posts by tag
 *
 * @param tag - Tag to filter by
 * @param limit - Maximum number of posts
 * @returns Array of posts
 */
export function getPostsByTag(tag: string, limit: number = 20): CommunityPost[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE tags LIKE ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `);
  const rows = stmt.all(`%"${tag}"%`, limit) as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get posts by category
 *
 * @param category - Category to filter by
 * @param limit - Maximum number of posts
 * @returns Array of posts
 */
export function getPostsByCategory(category: string, limit: number = 20): CommunityPost[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE category = ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `);
  const rows = stmt.all(category, limit) as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get trending posts
 * Trending score = (likes * 2 + commentCount * 3 + viewCount) / age_in_hours
 *
 * @param limit - Maximum number of posts
 * @returns Array of trending posts
 */
export function getTrendingPosts(limit: number = 20): CommunityPost[] {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE status = 'active'
    ORDER BY (likes * 2 + commentCount * 3 + viewCount) / ((? - createdAt) / 3600000.0 + 1) DESC
    LIMIT ?
  `);
  const rows = stmt.all(now, limit) as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get bookmarked posts by user
 *
 * @param userId - User ID
 * @returns Array of bookmarked posts
 */
export function getBookmarkedPostsByUser(userId: string): CommunityPost[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM posts
    WHERE bookmarkedBy LIKE ? AND status = 'active'
    ORDER BY createdAt DESC
  `);
  const rows = stmt.all(`%"${userId}"%`) as PostRow[];

  return rows.map(rowToPost);
}

// ============================================================================
// D. Post Moderation (2 functions)
// ============================================================================

/**
 * Moderate post content
 *
 * @param postId - Post ID
 * @param moderationResult - Moderation result from content filter
 * @returns Updated post
 */
export function moderatePost(
  postId: string,
  moderationResult: ModerationAction & {
    shouldHide?: boolean;
    filteredContent?: string;
    warning?: string;
  }
): CommunityPost {
  const db = getDatabase();
  const now = Date.now();

  const post = getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  const finalContent = moderationResult.filteredContent || post.content;
  const status = moderationResult.shouldHide ? 'hidden' : post.status;

  const stmt = db.prepare(`
    UPDATE posts
    SET
      content = ?,
      status = ?,
      moderationAction = ?,
      originalContent = ?,
      moderationWarning = ?,
      updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(
    finalContent,
    status,
    JSON.stringify(moderationResult),
    post.content,
    moderationResult.warning || null,
    now,
    postId
  );

  console.log(`✅ [CommunityRepository] Moderated post: ${postId}`);

  const updated = getPostById(postId);
  if (!updated) throw new Error(`Post not found after moderation: ${postId}`);
  return updated;
}

/**
 * Increment or decrement comment count
 *
 * @param postId - Post ID
 * @param delta - Change in comment count (positive or negative)
 */
export function incrementCommentCount(postId: string, delta: number): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE posts SET commentCount = commentCount + ? WHERE id = ?
  `);
  stmt.run(delta, postId);

  console.log(`✅ [CommunityRepository] Updated comment count for post ${postId}: ${delta > 0 ? '+' : ''}${delta}`);
}

// ============================================================================
// Batch Operations for Migration (SQLITE-018)
// ============================================================================

/**
 * Batch create posts for migration
 *
 * @param posts - Array of posts to create
 * @returns Number of posts created
 */
export function batchCreatePosts(posts: Array<Omit<CommunityPost, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp }>): number {
  const db = getDatabase();
  let created = 0;

  const insertMany = db.transaction((postsToInsert) => {
    const stmt = db.prepare(`
      INSERT INTO posts (
        id, authorId, authorName, title, content, tags, category,
        likes, likedBy, bookmarkedBy, commentCount, viewCount,
        status, isEdited, moderationAction, originalContent, moderationWarning,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const post of postsToInsert) {
      stmt.run(
        post.id,
        post.authorId,
        post.authorName,
        post.title || null,
        post.content,
        JSON.stringify(post.tags || []),
        post.category || null,
        post.likes || 0,
        JSON.stringify(post.likedBy || []),
        JSON.stringify(post.bookmarkedBy || []),
        post.commentCount || 0,
        post.viewCount || 0,
        post.status || 'active',
        post.isEdited ? 1 : 0,
        post.moderationAction || null,
        post.originalContent || null,
        post.moderationWarning || null,
        toUnixTimestamp(post.createdAt),
        toUnixTimestamp(post.updatedAt)
      );
      created++;
    }
  });

  insertMany(posts);
  console.log(`✅ [CommunityRepository] Batch created ${created} posts`);
  return created;
}
