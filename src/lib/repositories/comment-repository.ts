/**
 * @fileOverview Comment Repository for SQLite Database
 *
 * This module provides CRUD operations for comment data using SQLite,
 * supporting nested replies with unlimited depth, tree building, and interactions.
 *
 * Features:
 * - Basic CRUD operations (create, read, delete with soft delete)
 * - Tree building algorithm for nested comment structure
 * - Reply count management (denormalized)
 * - Like/unlike functionality
 * - Author and post queries
 * - Depth calculation for nested replies
 *
 * @phase Phase 3 - SQLITE-015 Comment Repository Implementation
 */

import { getDatabase, type Client, fromUnixTimestamp } from '../sqlite-db';
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
 * Comment data interface for database operations
 */
export interface CommentRow {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId: string | null;
  depth: number;
  replyCount: number;
  likes: number;
  likedBy: string; // JSON array
  status: 'active' | 'hidden' | 'deleted';
  isEdited: number; // 0 or 1 (boolean)
  moderationAction: string | null;
  originalContent: string | null;
  moderationWarning: string | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * Comment interface matching service layer
 */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
  depth: number;
  replyCount: number;
  likes: number;
  likedBy: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  status: 'active' | 'hidden' | 'deleted';
  moderationAction?: ModerationAction;
  originalContent?: string;
  moderationWarning?: string;
}

/**
 * Comment tree node for hierarchical display
 */
export interface CommentTreeNode extends Comment {
  replies: CommentTreeNode[];
}

/**
 * Convert database row to Comment
 */
function rowToComment(row: CommentRow): Comment {
  // Helper: Parse moderationAction safely (handle both JSON object and plain string)
  let parsedModerationAction: ModerationAction | undefined = undefined;
  if (row.moderationAction) {
    try {
      // Try to parse as JSON first (for object format)
      parsedModerationAction = JSON.parse(row.moderationAction);
    } catch {
      // If parsing fails, it's likely a plain string like "allow"
      parsedModerationAction = row.moderationAction as any;
    }
  }

  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    authorName: row.authorName,
    content: row.content,
    parentCommentId: row.parentCommentId || undefined,
    depth: row.depth,
    replyCount: row.replyCount,
    likes: row.likes,
    likedBy: row.likedBy ? JSON.parse(row.likedBy) : [],
    status: row.status,
    isEdited: row.isEdited === 1,
    moderationAction: parsedModerationAction,
    originalContent: row.originalContent || undefined,
    moderationWarning: row.moderationWarning || undefined,
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.updatedAt),
  };
}

/**
 * Generate unique comment ID
 */
function generateCommentId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// A. Basic CRUD Operations (4 functions)
// ============================================================================

/**
 * Create a new comment
 * Note: Content moderation should be performed at the service layer before calling this function
 *
 * @param comment - Comment data (content should already be moderated)
 * @returns Created comment ID
 */
export async function createComment(comment: {
  id?: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
  status?: 'active' | 'hidden' | 'deleted';
  moderationAction?: string;
  originalContent?: string;
  moderationWarning?: string;
}): Promise<string> {
  const db = getDatabase();
  const now = Date.now();
  const commentId = comment.id || generateCommentId();

  // Calculate depth based on parent comment
  let depth = 0;
  if (comment.parentCommentId) {
    const parent = await getCommentById(comment.parentCommentId);
    if (!parent) {
      throw new Error(`Parent comment not found: ${comment.parentCommentId}`);
    }
    depth = parent.depth + 1;

    // Update parent's reply count
    updateReplyCount(comment.parentCommentId, 1);
  }

  await db.execute({
    sql: `
    INSERT INTO comments (
      id, postId, authorId, authorName, content, parentCommentId,
      depth, replyCount, likes, likedBy, status, isEdited,
      moderationAction, originalContent, moderationWarning,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
    commentId,
    comment.postId,
    comment.authorId,
    comment.authorName,
    comment.content,
    comment.parentCommentId || null,
    depth,
    0, // replyCount
    0, // likes
    JSON.stringify([]), // likedBy
    comment.status || 'active',
    0, // isEdited
    comment.moderationAction ? JSON.stringify(comment.moderationAction) : null, // Serialize to JSON
    comment.originalContent || null,
    comment.moderationWarning || null,
    now,
    now
  ]
  });

  console.log(`✅ [CommentRepository] Created comment: ${commentId} (depth: ${depth})`);
  return commentId;
}

/**
 * Get comment by ID
 *
 * @param commentId - Comment ID
 * @returns Comment or null if not found
 */
export async function getCommentById(commentId: string): Promise<Comment | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM comments WHERE id = ?`,
    args: [commentId]
  });
  const row = result.rows[0] as unknown as CommentRow | undefined;

  return row ? rowToComment(row) : null;
}

/**
 * Get comments for a post (flat list, ordered by creation time)
 *
 * @param postId - Post ID
 * @param limit - Maximum number of comments (optional)
 * @returns Array of comments
 */
export async function getCommentsByPost(postId: string, limit?: number): Promise<Comment[]> {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`🔍 [CommentRepository] Getting comments for post: ${postId}`);
  console.log(`📊 [CommentRepository] Limit: ${limit || 'unlimited'}`);

  try {
    // Step 1: Get database instance
    console.log('🗄️  [CommentRepository] Getting database instance...');
    const db = await getDatabase();
    console.log('✅ [CommentRepository] Database instance obtained successfully');

    // Step 2: Prepare query
    let query = 'SELECT * FROM comments WHERE postId = ? AND status = ? ORDER BY createdAt ASC';
    const params: any[] = [postId, 'active'];

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    console.log('📝 [CommentRepository] Query:', query);
    console.log('🔧 [CommentRepository] Params:', JSON.stringify(params));

    // Step 3: Execute query
    console.log('⚡ [CommentRepository] Executing query...');
    const result = await db.execute({ sql: query, args: params });
    const rows = result.rows as unknown as CommentRow[];

    console.log(`✅ [CommentRepository] Query executed successfully`);
    console.log(`📊 [CommentRepository] Found ${rows.length} comments`);

    // Step 4: Convert rows to Comment objects
    const comments = rows.map(rowToComment);
    console.log(`✅ [CommentRepository] Converted ${comments.length} comments to objects`);
    console.log(`${'━'.repeat(80)}\n`);

    return comments;
  } catch (error: any) {
    console.error(`\n${'━'.repeat(80)}`);
    console.error('❌ [CommentRepository] Error in getCommentsByPost:');
    console.error('━'.repeat(80));
    console.error('Error details:', error);
    console.error('Post ID:', postId);
    console.error('Limit:', limit);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('Error name:', error?.name);
    console.error(`${'━'.repeat(80)}\n`);

    // Re-throw with more context
    throw new Error(`[CommentRepository] Failed to get comments for post ${postId}: ${error?.message || error}`);
  }
}

/**
 * Delete comment (soft delete - preserves structure for replies)
 *
 * @param commentId - Comment ID
 */
export async function deleteComment(commentId: string): Promise<void> {
  const db = getDatabase();

  const comment = await getCommentById(commentId);
  if (!comment) {
    throw new Error(`Comment not found: ${commentId}`);
  }

  // Soft delete: mark as deleted, replace content
  await db.execute({
    sql: `
    UPDATE comments
    SET status = 'deleted', content = '[已刪除]', updatedAt = ?
    WHERE id = ?
  `,
    args: [Date.now(), commentId]
  });

  // Update parent's reply count if this is a reply
  if (comment.parentCommentId) {
    updateReplyCount(comment.parentCommentId, -1);
  }

  console.log(`✅ [CommentRepository] Deleted comment: ${commentId} (soft delete)`);
}

// ============================================================================
// B. Tree Operations (3 functions)
// ============================================================================

/**
 * Build hierarchical comment tree for a post
 *
 * @param postId - Post ID
 * @returns Array of root comment nodes with nested replies
 */
export async function buildCommentTree(postId: string): Promise<CommentTreeNode[]> {
  const db = getDatabase();

  // Load all active comments for the post
  const result = await db.execute({
    sql: `
    SELECT * FROM comments
    WHERE postId = ? AND status != 'deleted'
    ORDER BY createdAt ASC
  `,
    args: [postId]
  });
  const rows = result.rows as unknown as CommentRow[];

  if (rows.length === 0) {
    return [];
  }

  // Convert rows to comments
  const comments = rows.map(rowToComment);

  // Build map: commentId -> comment with replies array
  const commentMap = new Map<string, CommentTreeNode>();
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Build tree structure
  const roots: CommentTreeNode[] = [];

  comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;

    if (comment.parentCommentId) {
      // This is a reply - attach to parent
      const parent = commentMap.get(comment.parentCommentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        // Orphaned comment (parent deleted) - treat as root
        roots.push(node);
      }
    } else {
      // This is a root comment
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Get direct replies to a comment
 *
 * @param commentId - Parent comment ID
 * @returns Array of direct child comments
 */
export async function getCommentReplies(commentId: string): Promise<Comment[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM comments
    WHERE parentCommentId = ? AND status = 'active'
    ORDER BY createdAt ASC
  `,
    args: [commentId]
  });
  const rows = result.rows as unknown as CommentRow[];

  return rows.map(rowToComment);
}

/**
 * Update reply count for a comment (denormalized counter)
 *
 * @param commentId - Comment ID
 * @param delta - Change in reply count (positive or negative)
 */
export async function updateReplyCount(commentId: string, delta: number): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE comments SET replyCount = replyCount + ? WHERE id = ?
  `,
    args: [delta, commentId]
  });

  console.log(`✅ [CommentRepository] Updated reply count for comment ${commentId}: ${delta > 0 ? '+' : ''}${delta}`);
}

// ============================================================================
// C. Interaction Functions (2 functions)
// ============================================================================

/**
 * Like a comment
 *
 * @param commentId - Comment ID
 * @param userId - User ID
 * @returns Updated comment
 */
export async function likeComment(commentId: string, userId: string): Promise<Comment> {
  const db = getDatabase();

  const comment = await getCommentById(commentId);
  if (!comment) throw new Error(`Comment not found: ${commentId}`);

  if (comment.likedBy.includes(userId)) {
    console.log(`⚠️ [CommentRepository] User ${userId} already liked comment ${commentId}`);
    return comment;
  }

  const newLikedBy = [...comment.likedBy, userId];

  await db.execute({
    sql: `
    UPDATE comments
    SET likes = likes + 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newLikedBy), Date.now(), commentId]
  });

  console.log(`✅ [CommentRepository] User ${userId} liked comment ${commentId}`);

  const updated = await getCommentById(commentId);
  if (!updated) throw new Error(`Comment not found after like: ${commentId}`);
  return updated;
}

/**
 * Unlike a comment
 *
 * @param commentId - Comment ID
 * @param userId - User ID
 * @returns Updated comment
 */
export async function unlikeComment(commentId: string, userId: string): Promise<Comment> {
  const db = getDatabase();

  const comment = await getCommentById(commentId);
  if (!comment) throw new Error(`Comment not found: ${commentId}`);

  if (!comment.likedBy.includes(userId)) {
    console.log(`⚠️ [CommentRepository] User ${userId} hasn't liked comment ${commentId}`);
    return comment;
  }

  const newLikedBy = comment.likedBy.filter(id => id !== userId);

  await db.execute({
    sql: `
    UPDATE comments
    SET likes = likes - 1, likedBy = ?, updatedAt = ?
    WHERE id = ?
  `,
    args: [JSON.stringify(newLikedBy), Date.now(), commentId]
  });

  console.log(`✅ [CommentRepository] User ${userId} unliked comment ${commentId}`);

  const updated = await getCommentById(commentId);
  if (!updated) throw new Error(`Comment not found after unlike: ${commentId}`);
  return updated;
}

// ============================================================================
// D. Query Functions (2 functions)
// ============================================================================

/**
 * Get comments by author
 *
 * @param authorId - Author user ID
 * @param limit - Maximum number of comments (default: 20)
 * @returns Array of comments
 */
export async function getCommentsByAuthor(authorId: string, limit: number = 20): Promise<Comment[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM comments
    WHERE authorId = ? AND status = 'active'
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [authorId, limit]
  });
  const rows = result.rows as unknown as CommentRow[];

  return rows.map(rowToComment);
}

/**
 * Get comment count for a post
 *
 * @param postId - Post ID
 * @returns Number of active comments
 */
export async function getCommentCount(postId: string): Promise<number> {
  const db = getDatabase();

  const queryResult = await db.execute({
    sql: `
    SELECT COUNT(*) as count FROM comments
    WHERE postId = ? AND status = 'active'
  `,
    args: [postId]
  });
  const countRow = queryResult.rows[0] as unknown as { count: number };

  return countRow.count;
}

// ============================================================================
// Batch Operations for Migration (SQLITE-018)
// ============================================================================

/**
 * Batch create comments for migration
 *
 * @param comments - Array of comments to create
 * @returns Number of comments created
 */
export async function batchCreateComments(comments: Array<Omit<Comment, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp }>): Promise<number> {
  const db = await getDatabase();
  let created = 0;

  try {
    // Start transaction
    await db.execute('BEGIN');

    const sql = `
      INSERT INTO comments (
        id, postId, authorId, authorName, content, parentCommentId, depth, replyCount,
        likes, likedBy, status, isEdited, moderationAction, originalContent, moderationWarning,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const comment of comments) {
      await db.execute({
        sql,
        args: [
          comment.id,
          comment.postId,
          comment.authorId,
          comment.authorName,
          comment.content,
          comment.parentCommentId || null,
          comment.depth || 0,
          comment.replyCount || 0,
          comment.likes || 0,
          JSON.stringify(comment.likedBy || []),
          comment.status || 'active',
          comment.isEdited ? 1 : 0,
          comment.moderationAction || null,
          comment.originalContent || null,
          comment.moderationWarning || null,
          comment.createdAt.seconds * 1000, // Convert Firebase Timestamp to Unix milliseconds
          comment.updatedAt.seconds * 1000
        ]
      });
      created++;
    }

    // Commit transaction
    await db.execute('COMMIT');
    console.log(`✅ [CommentRepository] Batch created ${created} comments`);
    return created;
  } catch (error) {
    // Rollback transaction on error
    await db.execute('ROLLBACK');
    console.error(`❌ [CommentRepository] Batch create failed:`, error);
    throw error;
  }
}
