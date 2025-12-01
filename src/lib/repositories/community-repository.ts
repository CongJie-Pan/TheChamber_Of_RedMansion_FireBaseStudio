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

import { getDatabase, type Client, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
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
 * Task 4.9: Added sourceNoteId and editedAt for bi-directional note-post linking
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
  editedAt: number | null; // Task 4.9: Timestamp of last edit
  sourceNoteId: string | null; // Task 4.9: Reference to source note
  moderationAction: string | null;
  originalContent: string | null;
  moderationWarning: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Post interface matching community-service.ts
 * Task 4.9: Added sourceNoteId and editedAt for bi-directional note-post linking
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
  editedAt?: Timestamp; // Task 4.9: Timestamp of last edit
  sourceNoteId?: string; // Task 4.9: Reference to source note if shared from reading notes
  category?: string;
  status: 'active' | 'hidden' | 'deleted';
  bookmarkedBy: string[];
  moderationAction?: ModerationAction;
  originalContent?: string;
  moderationWarning?: string;
}

/**
 * Convert database row to CommunityPost
 * Task 4.9: Added sourceNoteId and editedAt fields
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
    editedAt: row.editedAt ? fromUnixTimestamp(row.editedAt) : undefined, // Task 4.9
    sourceNoteId: row.sourceNoteId || undefined, // Task 4.9
    // Fixed: Handle both string primitives and legacy JSON format for moderationAction
    moderationAction: row.moderationAction ?
      (typeof row.moderationAction === 'string' &&
       ['allow', 'warn', 'filter', 'hide', 'block', 'flag-for-review'].includes(row.moderationAction)
         ? row.moderationAction  // Direct string primitive (current format)
         : JSON.parse(row.moderationAction))  // Legacy JSON format
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
 * Task 4.9: Added sourceNoteId for bi-directional note-post linking
 *
 * @param post - Post data (content should already be moderated)
 * @returns Created post ID
 */
export async function createPost(post: {
  id: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags?: string[];
  category?: string;
  status?: 'active' | 'hidden' | 'deleted';
  sourceNoteId?: string; // Task 4.9: Reference to source note if shared from reading notes
  moderationAction?: string;
  originalContent?: string;
  moderationWarning?: string;
}): Promise<string> {
  const db = getDatabase();
  const now = Date.now();

  await db.execute({
    sql: `
    INSERT INTO posts (
      id, authorId, authorName, title, content, tags, category,
      likes, likedBy, bookmarkedBy, commentCount, viewCount,
      status, isEdited, editedAt, sourceNoteId, moderationAction, originalContent, moderationWarning,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
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
    null, // editedAt (Task 4.9)
    post.sourceNoteId || null, // sourceNoteId (Task 4.9)
    post.moderationAction || null,
    post.originalContent || null,
    post.moderationWarning || null,
    now,
    now
  ]
  });

  console.log(`✅ [CommunityRepository] Created post: ${post.id}${post.sourceNoteId ? ` (from note: ${post.sourceNoteId})` : ''}`);
  return post.id;
}

/**
 * Get post by ID
 *
 * @param postId - Post ID
 * @returns Post or null if not found
 */
export async function getPostById(postId: string): Promise<CommunityPost | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM posts WHERE id = ?`,
    args: [postId]
  });
  const row = result.rows[0] as unknown as PostRow | undefined;

  return row ? rowToPost(row) : null;
}

/**
 * Get posts with filters and pagination
 *
 * @param options - Query options
 * @returns Array of posts
 */
export async function getPosts(options: {
  category?: string;
  status?: 'active' | 'hidden' | 'deleted';
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'popular' | 'trending';
} = {}): Promise<CommunityPost[]> {
  const db = await getDatabase();

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

  const result = await db.execute({ sql: query, args: params });
  const rows = result.rows as unknown as PostRow[];

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
export async function updatePost(
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
): Promise<CommunityPost> {
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

    // Task 4.9: Set editedAt timestamp when content is modified
    fields.push('editedAt = ?');
    params.push(now);
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

  await db.execute({
    sql: `
    UPDATE posts SET ${fields.join(', ')} WHERE id = ?
  `,
    args: [...params]
  });

  console.log(`✅ [CommunityRepository] Updated post: ${postId}`);

  const updated = await getPostById(postId);
  if (!updated) throw new Error(`Post not found after update: ${postId}`);
  return updated;
}

/**
 * Delete post (soft delete)
 *
 * @param postId - Post ID
 */
export async function deletePost(postId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE posts SET status = 'deleted', updatedAt = ? WHERE id = ?
  `,
    args: [Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] Deleted post: ${postId}`);
}

/**
 * Check if post exists
 *
 * @param postId - Post ID
 * @returns True if post exists
 */
export async function postExists(postId: string): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: 'SELECT 1 FROM posts WHERE id = ? LIMIT 1',
    args: [postId]
  });

  return result.rows.length > 0;
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
export async function likePost(postId: string, userId: string): Promise<CommunityPost> {
  const db = getDatabase();

  const post = await getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (post.likedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} already liked post ${postId}`);
    return post;
  }

  const newLikedBy = [...post.likedBy, userId];

  await db.execute({
    sql: `
    UPDATE posts
    SET likes = likes + 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newLikedBy), Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] User ${userId} liked post ${postId}`);

  const updated = await getPostById(postId);
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
export async function unlikePost(postId: string, userId: string): Promise<CommunityPost> {
  const db = getDatabase();

  const post = await getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (!post.likedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} hasn't liked post ${postId}`);
    return post;
  }

  const newLikedBy = post.likedBy.filter(id => id !== userId);

  await db.execute({
    sql: `
    UPDATE posts
    SET likes = likes - 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newLikedBy), Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] User ${userId} unliked post ${postId}`);

  const updated = await getPostById(postId);
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
export async function bookmarkPost(postId: string, userId: string): Promise<CommunityPost> {
  const db = getDatabase();

  const post = await getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (post.bookmarkedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} already bookmarked post ${postId}`);
    return post;
  }

  const newBookmarkedBy = [...post.bookmarkedBy, userId];

  await db.execute({
    sql: `
    UPDATE posts
    SET bookmarkedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newBookmarkedBy), Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] User ${userId} bookmarked post ${postId}`);

  const updated = await getPostById(postId);
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
export async function unbookmarkPost(postId: string, userId: string): Promise<CommunityPost> {
  const db = getDatabase();

  const post = await getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  if (!post.bookmarkedBy.includes(userId)) {
    console.log(`⚠️ [CommunityRepository] User ${userId} hasn't bookmarked post ${postId}`);
    return post;
  }

  const newBookmarkedBy = post.bookmarkedBy.filter(id => id !== userId);

  await db.execute({
    sql: `
    UPDATE posts
    SET bookmarkedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newBookmarkedBy), Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] User ${userId} unbookmarked post ${postId}`);

  const updated = await getPostById(postId);
  if (!updated) throw new Error(`Post not found after unbookmark: ${postId}`);
  return updated;
}

/**
 * Increment post view count
 *
 * @param postId - Post ID
 */
export async function incrementViewCount(postId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE posts SET viewCount = viewCount + 1 WHERE id = ?
  `,
    args: [postId]
  });
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
export async function getPostsByAuthor(authorId: string, limit: number = 20): Promise<CommunityPost[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE authorId = ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [authorId, limit]
  });
  const rows = result.rows as unknown as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get posts by tag
 *
 * @param tag - Tag to filter by
 * @param limit - Maximum number of posts
 * @returns Array of posts
 */
export async function getPostsByTag(tag: string, limit: number = 20): Promise<CommunityPost[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE tags LIKE ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [`%"${tag}"%`, limit]
  });
  const rows = result.rows as unknown as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get posts by category
 *
 * @param category - Category to filter by
 * @param limit - Maximum number of posts
 * @returns Array of posts
 */
export async function getPostsByCategory(category: string, limit: number = 20): Promise<CommunityPost[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE category = ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [category, limit]
  });
  const rows = result.rows as unknown as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get trending posts
 * Trending score = (likes * 2 + commentCount * 3 + viewCount) / age_in_hours
 *
 * @param limit - Maximum number of posts
 * @returns Array of trending posts
 */
export async function getTrendingPosts(limit: number = 20): Promise<CommunityPost[]> {
  const db = getDatabase();
  const now = Date.now();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE status = 'active'
    ORDER BY (likes * 2 + commentCount * 3 + viewCount) / ((? - createdAt) / 3600000.0 + 1) DESC
    LIMIT ?
  `,
    args: [now, limit]
  });
  const rows = result.rows as unknown as PostRow[];

  return rows.map(rowToPost);
}

/**
 * Get bookmarked posts by user
 *
 * @param userId - User ID
 * @returns Array of bookmarked posts
 */
export async function getBookmarkedPostsByUser(userId: string): Promise<CommunityPost[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE bookmarkedBy LIKE ? AND status = 'active'
    ORDER BY createdAt DESC
  `,
    args: [`%"${userId}"%`]
  });
  const rows = result.rows as unknown as PostRow[];

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
export async function moderatePost(
  postId: string,
  moderationResult: ModerationAction & {
    shouldHide?: boolean;
    filteredContent?: string;
    warning?: string;
  }
): Promise<CommunityPost> {
  const db = getDatabase();
  const now = Date.now();

  const post = await getPostById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);

  const finalContent = moderationResult.filteredContent || post.content;
  const status = moderationResult.shouldHide ? 'hidden' : post.status;

  await db.execute({
    sql: `
    UPDATE posts
    SET
      content = ?,
      status = ?,
      moderationAction = ?,
      originalContent = ?,
      moderationWarning = ?,
      updatedAt = ?
    WHERE id = ?
  `,
    args: [
    finalContent,
    status,
    JSON.stringify(moderationResult),
    post.content,
    moderationResult.warning || null,
    now,
    postId
  ]
  });

  console.log(`✅ [CommunityRepository] Moderated post: ${postId}`);

  const updated = await getPostById(postId);
  if (!updated) throw new Error(`Post not found after moderation: ${postId}`);
  return updated;
}

/**
 * Increment or decrement comment count
 *
 * @param postId - Post ID
 * @param delta - Change in comment count (positive or negative)
 */
export async function incrementCommentCount(postId: string, delta: number): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE posts SET commentCount = commentCount + ? WHERE id = ?
  `,
    args: [delta, postId]
  });

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
export async function batchCreatePosts(posts: Array<Omit<CommunityPost, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp }>): Promise<number> {
  const db = await getDatabase();
  let created = 0;

  try {
    // Start transaction
    await db.execute('BEGIN');

    const sql = `
      INSERT INTO posts (
        id, authorId, authorName, title, content, tags, category,
        likes, likedBy, bookmarkedBy, commentCount, viewCount,
        status, isEdited, moderationAction, originalContent, moderationWarning,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const post of posts) {
      await db.execute({
        sql,
        args: [
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
        ]
      });
      created++;
    }

    // Commit transaction
    await db.execute('COMMIT');
    console.log(`✅ [CommunityRepository] Batch created ${created} posts`);
    return created;
  } catch (error) {
    // Rollback transaction on error
    await db.execute('ROLLBACK');
    console.error(`❌ [CommunityRepository] Batch create failed:`, error);
    throw error;
  }
}

// ============================================================================
// Task 4.9: Note-Post Sync Functions
// ============================================================================

/**
 * Get post by source note ID
 * Task 4.9: Find the community post linked to a specific note
 *
 * @param noteId - Source note ID
 * @returns Post or null if not found
 */
export async function getPostBySourceNoteId(noteId: string): Promise<CommunityPost | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM posts WHERE sourceNoteId = ?`,
    args: [noteId]
  });
  const row = result.rows[0] as unknown as PostRow | undefined;

  return row ? rowToPost(row) : null;
}

/**
 * Sync post content from source note
 * Task 4.9: Update post content and mark as edited when source note is modified
 *
 * @param postId - Post ID
 * @param content - New content from source note
 * @param selectedText - New selected text from source note
 * @returns Updated post
 */
export async function syncPostFromNote(
  postId: string,
  content: string,
  selectedText: string
): Promise<CommunityPost> {
  // Task 4.9/4.10 Debug Logging
  console.log(`🔄 [CommunityRepo] syncPostFromNote called:`, {
    postId,
    contentLength: content.length,
    selectedTextLength: selectedText?.length || 0
  });

  const db = getDatabase();
  const now = Date.now();

  // Format content to include selected text
  const formattedContent = selectedText
    ? `「${selectedText}」\n\n${content}`
    : content;

  await db.execute({
    sql: `
    UPDATE posts
    SET content = ?, isEdited = 1, editedAt = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [formattedContent, now, now, postId]
  });

  console.log(`✅ [CommunityRepo] Post synced with isEdited=1:`, {
    postId,
    editedAt: now,
    formattedContentLength: formattedContent.length
  });

  const updated = await getPostById(postId);
  if (!updated) throw new Error(`Post not found after sync: ${postId}`);
  return updated;
}

/**
 * Link a post to its source note
 * Task 4.9: Establish bi-directional link from post to note
 *
 * @param postId - Post ID
 * @param noteId - Source note ID
 */
export async function linkPostToNote(postId: string, noteId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `UPDATE posts SET sourceNoteId = ?, updatedAt = ? WHERE id = ?`,
    args: [noteId, Date.now(), postId]
  });

  console.log(`✅ [CommunityRepository] Linked post ${postId} to note ${noteId}`);
}

/**
 * Create bi-directional link between note and post atomically
 * Task 4.9: Uses batch operation for atomicity (prevents race conditions)
 *
 * @param postId - Post ID
 * @param noteId - Source note ID
 */
export async function linkNoteAndPostBidirectional(postId: string, noteId: string): Promise<void> {
  // Task 4.9/4.10 Debug Logging
  console.log(`🔗 [CommunityRepo] linkNoteAndPostBidirectional called:`, { postId, noteId });

  const db = getDatabase();
  const now = Date.now();

  // Use batch to ensure atomicity of both updates
  await db.batch([
    {
      sql: `UPDATE posts SET sourceNoteId = ?, updatedAt = ? WHERE id = ?`,
      args: [noteId, now, postId]
    },
    {
      sql: `UPDATE notes SET sharedPostId = ?, lastModified = ? WHERE id = ?`,
      args: [postId, now, noteId]
    }
  ], 'write');

  console.log(`✅ [CommunityRepo] Bi-directional link established:`, {
    'posts.sourceNoteId': noteId,
    'notes.sharedPostId': postId,
    timestamp: now
  });
}

/**
 * Get all posts that were created from notes (shared notes)
 * Task 4.9: Get posts linked to notes for a specific user
 *
 * @param authorId - Author user ID
 * @returns Array of posts with sourceNoteId
 */
export async function getPostsFromNotesByAuthor(authorId: string): Promise<CommunityPost[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM posts
    WHERE authorId = ? AND sourceNoteId IS NOT NULL AND status = 'active'
    ORDER BY updatedAt DESC
  `,
    args: [authorId]
  });
  const rows = result.rows as unknown as PostRow[];

  return rows.map(rowToPost);
}
