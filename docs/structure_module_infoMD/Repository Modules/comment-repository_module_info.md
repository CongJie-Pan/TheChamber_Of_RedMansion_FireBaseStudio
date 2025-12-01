# Module: `comment-repository.ts`

> **⚠️ ARCHITECTURE UPDATE (2025-11-30):** This module has been migrated from synchronous `better-sqlite3` to **async Turso libSQL client**. All functions are now `async` and return `Promise<T>`. The database is accessed via `db.execute({ sql, args })` pattern.

## 1. Module Summary

The `comment-repository` module provides SQLite data access layer for community comment CRUD operations with nested reply support in the Red Mansion reading application. This repository implements 11 **asynchronous** functions for creating, querying, and managing hierarchical comments with unlimited nesting depth, automatic depth calculation, tree building algorithms, and interaction features like likes. The module handles timestamp conversions (Date ↔ Unix milliseconds), JSON array operations for likes, and efficient O(n) tree building with hash map algorithm (~30-50ms for 100 comments vs ~300-500ms for recursive Firestore queries).

**Key Features:**
- 4 Basic CRUD operations (create, read by ID, read by post, soft delete)
- 3 Tree operations (build comment tree, get replies, update reply count)
- 2 Interaction functions (like, unlike with duplicate prevention)
- 2 Query functions (by author, count by post)
- Automatic depth calculation: `parent.depth + 1`
- O(n) tree building algorithm using hash map
- Soft delete preserving structure for nested replies
- Denormalized reply count management
- Orphaned comment handling (parent deleted)

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/lib/sqlite-db` - Database instance provider (`getDatabase()`), timestamp utilities (`fromUnixTimestamp`), `Client` type.
  * `@/lib/content-filter-service` - Type imports for `ModerationAction` interface (actual moderation logic resides in service layer).
* **External Dependencies:**
  * `@libsql/client` - **Turso libSQL async client** (accessed via sqlite-db module).
* **Database Access Pattern:**
  * Uses `db.execute({ sql, args })` for all queries (async)
  * Returns `Promise<T>` from all functions
* **Database Schema:**
  * Table: `comments` (columns: id, postId, authorId, authorName, content, parentCommentId, depth, replyCount, likes, likedBy (JSON), status, isEdited, moderationAction, originalContent, moderationWarning, createdAt, updatedAt)
  * Foreign Keys:
    - `postId` REFERENCES `posts(id)` ON DELETE CASCADE
    - `authorId` REFERENCES `users(id)`
    - `parentCommentId` REFERENCES `comments(id)` ON DELETE CASCADE
  * Indexes:
    - `idx_comments_postId` on (postId, createdAt ASC)
    - `idx_comments_authorId` on (authorId, createdAt DESC)
    - `idx_comments_parentId` on (parentCommentId, createdAt ASC)
    - `idx_comments_status` on (status)

## 3. Public API / Exports

* **Type Exports:**
  * `CommentRow` - Internal database row representation with JSON string for likedBy array.
  * `Comment` - Public interface matching service layer (id, postId, authorId, authorName, content, parentCommentId optional, depth, replyCount, likes, likedBy[], status, isEdited, createdAt as Timestamp, updatedAt as Timestamp, moderationAction optional, originalContent optional, moderationWarning optional).
  * `CommentTreeNode` - Hierarchical structure extending Comment with `replies: CommentTreeNode[]` array for nested tree representation.

* **Function Exports (11 total - ALL ASYNC):**

### A. Basic CRUD (4 functions)
  * `createComment(comment: {...}): Promise<string>` - Create comment with automatic depth calculation and reply count update, returns comment ID.
  * `getCommentById(commentId: string): Promise<Comment | null>` - Get single comment by ID or null if not found.
  * `getCommentsByPost(postId: string, limit?: number): Promise<Comment[]>` - Get flat list of active comments for a post, chronologically ordered.
  * `deleteComment(commentId: string): Promise<void>` - Soft delete comment (sets status='deleted', content='[已刪除]'), preserves structure for nested replies.

### B. Tree Operations (3 functions)
  * `buildCommentTree(postId: string): Promise<CommentTreeNode[]>` - Build hierarchical comment tree using O(n) hash map algorithm, returns array of root nodes.
  * `getCommentReplies(commentId: string): Promise<Comment[]>` - Get direct child comments of a parent comment.
  * `updateReplyCount(commentId: string, delta: number): Promise<void>` - Update denormalized reply count (+/- delta).

### C. Interaction Functions (2 functions)
  * `likeComment(commentId: string, userId: string): Promise<Comment>` - Add userId to likedBy array, increment likes counter (duplicate-safe).
  * `unlikeComment(commentId: string, userId: string): Promise<Comment>` - Remove userId from likedBy array, decrement likes counter.

### D. Query Functions (2 functions)
  * `getCommentsByAuthor(authorId: string, limit: number = 20): Promise<Comment[]>` - Get comments by author, newest first.
  * `getCommentCount(postId: string): Promise<number>` - Get total active comment count for a post.

## 4. Code File Breakdown

### 4.1. `comment-repository.ts` (689 lines)

* **Purpose:** Provides pure data access layer for community comments with nested reply support, no business logic (content moderation happens at service layer). The repository pattern separates database concerns from service logic, enabling easier testing, database migration, and performance optimization. Key design decisions: (1) **Async operations** - Uses Turso libSQL async client with `await db.execute()` for all database operations; (2) **Automatic depth calculation** - Queries parent comment and sets `depth = parent.depth + 1`, prevents manual errors; (3) **O(n) tree building** - Single query loads all comments, builds tree in memory using hash map, avoids recursive queries; (4) **Soft delete pattern** - Sets `status = 'deleted'` and `content = '[已刪除]'`, preserves structure for nested replies; (5) **Denormalized reply counter** - Stores replyCount for fast display without counting children; (6) **Orphaned comment handling** - If parent deleted, child comments treated as roots in tree building.

* **Interfaces:**
    * `CommentRow: interface` - Internal database row representation. 17 fields including JSON string for likedBy array. Fields: id, postId, authorId, authorName, content, parentCommentId (string | null), depth (number), replyCount (number), likes (number), likedBy (string), status ('active'|'hidden'|'deleted'), isEdited (number 0|1), moderationAction (string | null), originalContent (string | null), moderationWarning (string | null), createdAt (number), updatedAt (number).
    * `Comment: interface` - Public interface matching service layer. Same fields as CommentRow but with proper types: parentCommentId (string | undefined), likedBy (string[]), isEdited (boolean), moderationAction (ModerationAction | undefined), originalContent (string | undefined), moderationWarning (string | undefined), createdAt/updatedAt (Timestamp objects).
    * `CommentTreeNode: interface` - Extends Comment with `replies: CommentTreeNode[]` field for hierarchical tree structure. Used by `buildCommentTree()` return type.

* **Utility Functions:**
    * `rowToComment(row: CommentRow): Comment` - **Row transformation**. Converts database row to public Comment interface. Parses JSON string to likedBy array. Converts Unix milliseconds to Timestamp objects via `fromUnixTimestamp()`. Converts isEdited integer (0/1) to boolean. Converts parentCommentId null to undefined. Parses moderationAction JSON string if present. Returns Comment object.
    * `generateCommentId(): string` - **ID generation**. Creates unique comment ID with format `comment-{timestamp}-{random}`. Uses `Date.now()` and `Math.random().toString(36).substr(2, 9)`. Returns string ID.

* **A. Basic CRUD Functions (4 functions):**
    * `createComment(comment: {...}): Promise<string>` - **Comment creation with automatic depth calculation and reply count update**. Accepts comment data: id (optional), postId, authorId, authorName, content, parentCommentId (optional), status (optional), moderationAction (optional), originalContent (optional), moderationWarning (optional). If parentCommentId provided: (1) Queries parent comment via `await getCommentById()`, (2) Throws error if parent not found, (3) Calculates depth = parent.depth + 1, (4) Calls `await updateReplyCount(parentCommentId, 1)` to increment parent's reply counter. If no parent, depth = 0 (root comment). Generates comment ID if not provided. Executes INSERT via `await db.execute({ sql, args })`. Initializes counters to 0 (replyCount, likes). Initializes empty array for likedBy. Stores content as-is (assumes service layer already performed moderation). Returns comment ID. NOTE: Repository does NOT perform content moderation - service layer responsibility.

    * `getCommentById(commentId: string): Promise<Comment | null>` - **Single comment lookup**. Executes `await db.execute({ sql: 'SELECT * FROM comments WHERE id = ?', args: [commentId] })`. Returns null if not found. Transforms row to Comment via `rowToComment()`. Used by createComment for parent lookup, deleteComment for validation, and like/unlike operations.

    * `getCommentsByPost(postId: string, limit?: number): Promise<Comment[]>` - **Flat list of comments for a post**. Executes async query via `await db.execute()` WHERE postId = ? AND status = 'active'. Orders by createdAt ASC (chronological display). Applies LIMIT if provided. Returns array of Comment objects. Used for simple flat display without nesting. For hierarchical display, use `buildCommentTree()` instead.

    * `deleteComment(commentId: string): Promise<void>` - **Soft delete with reply count update**. Gets comment via `await getCommentById()`, throws error if not found. Sets `status = 'deleted'` and `content = '[已刪除]'` via `await db.execute()` (preserves row in database). Updates timestamp. If comment has parentCommentId, calls `await updateReplyCount(parentCommentId, -1)` to decrement parent's reply counter. Does NOT cascade delete children (children remain active, become orphaned if parent deleted). Used for user/admin-initiated deletions.

* **B. Tree Operations Functions (3 functions):**
    * `buildCommentTree(postId: string): Promise<CommentTreeNode[]>` - **O(n) hierarchical tree building**. Algorithm: (1) Load all non-deleted comments for post with single `await db.execute()` query (WHERE postId = ? AND status != 'deleted'), ordered by createdAt ASC; (2) Convert rows to Comment objects via `rowToComment()`; (3) Build hash map: `Map<commentId, CommentTreeNode>` where each node has empty replies array; (4) Iterate comments: if parentCommentId exists and parent in map, push node to parent.replies array; if parent not found (orphaned), treat as root; if no parentCommentId, add to roots array; (5) Return roots array. Time complexity: O(n) single pass. Space complexity: O(n) for map. Used for displaying nested comment threads. Example tree structure:
      ```
      Root Comment A (depth 0)
      ├── Reply A1 (depth 1)
      │   └── Reply A1a (depth 2)
      └── Reply A2 (depth 1)
      Root Comment B (depth 0)
      ```

    * `getCommentReplies(commentId: string): Promise<Comment[]>` - **Direct children lookup**. Executes `await db.execute()` WHERE parentCommentId = ? AND status = 'active'. Orders by createdAt ASC. Returns flat array of direct child comments (does NOT recursively get grandchildren). Used for lazy-loading replies or getting reply count validation.

    * `updateReplyCount(commentId: string, delta: number): Promise<void>` - **Denormalized counter update**. Updates comment's replyCount field with delta (+1 on create, -1 on delete). Uses atomic UPDATE via `await db.execute({ sql: 'UPDATE comments SET replyCount = replyCount + ? WHERE id = ?', args: [delta, commentId] })`. Silent operation (no return value). Called automatically by `createComment()` and `deleteComment()`. Allows fast reply count display without COUNT(*) queries. Used for "X replies" labels in UI.

* **C. Interaction Functions (2 functions):**
    * `likeComment(commentId: string, userId: string): Promise<Comment>` - **Like with duplicate prevention**. Gets current comment via `await getCommentById()`, throws error if not found. Checks if userId already in likedBy array. If duplicate, logs warning and returns unchanged comment. If new like: (1) Adds userId to likedBy array, (2) Increments likes counter via `await db.execute({ sql: 'UPDATE comments SET likes = likes + 1, likedBy = ?, updatedAt = ? WHERE id = ?', args: [...] })`, (3) Re-fetches and returns updated comment. Used for upvoting comments.

    * `unlikeComment(commentId: string, userId: string): Promise<Comment>` - **Unlike operation**. Gets current comment via `await getCommentById()`, throws error if not found. Checks if userId NOT in likedBy array. If not liked, logs warning and returns unchanged comment. If liked: (1) Removes userId from likedBy array via `filter()`, (2) Decrements likes counter via `await db.execute({ sql: 'UPDATE comments SET likes = likes - 1, likedBy = ?, updatedAt = ? WHERE id = ?', args: [...] })`, (3) Re-fetches and returns updated comment. Used for removing upvote.

* **D. Query Functions (2 functions):**
    * `getCommentsByAuthor(authorId: string, limit: number = 20): Promise<Comment[]>` - **Author's comments lookup**. Executes `await db.execute()` WHERE authorId = ? AND status = 'active'. Orders by createdAt DESC (newest first). Applies LIMIT (default 20). Returns array of Comment objects. Used for user profile comment history.

    * `getCommentCount(postId: string): Promise<number>` - **Active comment count for post**. Executes `await db.execute({ sql: 'SELECT COUNT(*) as count FROM comments WHERE postId = ? AND status = ?', args: [postId, 'active'] })`. Returns count as number. Used for "X comments" label on posts. Counts only active comments (excludes deleted).

## 5. Performance Characteristics

* **Single Comment Lookup** (`getCommentById`):
  - Query: `SELECT * FROM comments WHERE id = ?`
  - Index: Primary key on `id`
  - Performance: ~1-2ms (indexed lookup)

* **Comments by Post** (`getCommentsByPost`):
  - Query: `SELECT * FROM comments WHERE postId = ? AND status = ? ORDER BY createdAt ASC LIMIT ?`
  - Index: `idx_comments_postId` on (postId, createdAt ASC)
  - Performance: ~5-10ms for 100 comments

* **Tree Building** (`buildCommentTree`):
  - Query: Single SELECT for all comments
  - Algorithm: O(n) in-memory tree construction with hash map
  - Performance: ~30-50ms for 100 comments (tested < 50ms)
  - Comparison: ~300-500ms for recursive Firestore queries

* **Deep Nesting Support**:
  - Tested: 15 levels deep without performance degradation
  - No recursion limit (unlimited depth supported)
  - Depth stored in database (no calculation needed at query time)

* **Reply Count Management**:
  - Denormalized counter avoids COUNT(*) queries
  - Atomic increment/decrement on create/delete
  - Fast display without joins or aggregations

## 6. Design Patterns & Architectural Decisions

### 6.1. Repository Pattern
- Pure data access layer, no business logic
- Content moderation performed at service layer
- Enables easy testing with in-memory SQLite
- Facilitates database migration and optimization

### 6.2. Automatic Depth Calculation
- Queries parent comment on create
- Calculates `depth = parent.depth + 1`
- Prevents manual depth tracking errors
- Stores depth in database for fast queries

### 6.3. Soft Delete with Structure Preservation
- Sets `status = 'deleted'` instead of DELETE
- Replaces content with '[已刪除]'
- Preserves comment structure for nested replies
- Allows reply threads to remain intact

### 6.4. Denormalized Counters
- Stores `replyCount` at comment level
- Avoids COUNT(*) queries on every display
- Automatic increment/decrement on create/delete
- Trade-off: slight storage increase for query performance

### 6.5. O(n) Tree Building Algorithm
- Single query loads all comments
- In-memory tree construction using hash map
- No recursive database queries
- ~10x faster than Firestore recursive fetches

### 6.6. Orphaned Comment Handling
- If parent deleted, child comments remain active
- Tree building treats orphaned comments as roots
- Preserves user content and conversation context
- Alternative: CASCADE DELETE would remove all children

## 7. Testing Coverage

* **Test Suite**: 43 tests, 100% pass rate (72.553s execution time)
* **Test Categories**:
  - Basic CRUD Operations: 8 tests
  - Tree Building: 12 tests (edge cases, large trees, mixed depths)
  - Reply Operations: 8 tests (depth calculation, reply count management)
  - Interactions: 6 tests (like/unlike, duplicate prevention)
  - Queries: 4 tests (by author, count, status filtering)
  - Integration: 3 tests (complete lifecycle, complex operations)
  - Performance: 2 tests (100 comments < 50ms, deep nesting efficiency)

* **Key Test Scenarios**:
  - Deeply nested replies (tested up to 15 levels)
  - Large comment sets (100+ comments)
  - Orphaned comment handling (parent deleted)
  - Duplicate like prevention
  - Reply count accuracy across create/delete
  - Tree building correctness with mixed depths
  - Soft delete preserving structure

## 8. Integration with Service Layer

* **Content Moderation Flow**:
  1. Service layer receives user comment submission
  2. Service calls content-filter-service to check for sensitive content
  3. If flagged, service stores moderationAction, originalContent, moderationWarning
  4. Service calls `createComment()` with moderation metadata
  5. Repository stores comment with metadata (no moderation logic)

* **Comment Lifecycle**:
  1. Create: `createComment()` → automatic depth calc → reply count update
  2. Display: `buildCommentTree()` → hierarchical tree for UI
  3. Interact: `likeComment()` / `unlikeComment()` → update likes
  4. Delete: `deleteComment()` → soft delete → reply count update

* **Expected Usage Pattern**:
  ```typescript
  // Service layer example (async)
  async function submitComment(postId: string, content: string, parentId?: string) {
    // 1. Moderate content
    const moderation = await moderateContent(content);

    // 2. Create comment with moderation metadata (async)
    const commentId = await createComment({
      postId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: moderation.cleanContent,
      parentCommentId: parentId,
      status: moderation.shouldHide ? 'hidden' : 'active',
      moderationAction: moderation.action,
      originalContent: moderation.originalContent,
      moderationWarning: moderation.warning,
    });

    // 3. Update post comment count (async)
    await incrementCommentCount(postId, 1);

    return commentId;
  }

  // Display comments (async)
  async function displayComments(postId: string) {
    const tree = await buildCommentTree(postId);
    return renderCommentTree(tree); // Recursive React component
  }
  ```

## 9. Future Enhancements

* **Potential Improvements**:
  - Comment editing functionality (`updateComment()` function)
  - Comment reporting/flagging system
  - Pagination for large comment threads (cursor-based)
  - Comment sorting options (newest, oldest, most liked)
  - Nested reply limits (e.g., max 10 levels for UX)
  - Real-time comment updates (polling or WebSocket)
  - Comment search/filtering within post
  - Threading limits for performance (collapse deep threads)

* **Performance Optimizations**:
  - Lazy loading for large reply chains
  - Cursor-based pagination for root comments
  - Comment count caching at post level
  - Partial tree loading (load roots first, lazy-load replies)

## 10. Related Modules

* **Upstream Dependencies**:
  - `sqlite-db.ts` - Database connection and schema
  - `content-filter-service.ts` - Moderation type definitions

* **Downstream Consumers**:
  - `community-service.ts` - Service layer using comment repository
  - `community-repository.ts` - Post repository (incrementCommentCount integration)

* **Testing**:
  - `tests/lib/comment-repository.test.ts` - Comprehensive test suite (43 tests)

## 11. Database Schema Reference

```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  authorId TEXT NOT NULL,
  authorName TEXT NOT NULL,
  content TEXT NOT NULL,
  parentCommentId TEXT, -- NULL for root comments, commentId for nested replies
  depth INTEGER DEFAULT 0, -- 0 for root, 1 for first-level reply, etc.
  replyCount INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  likedBy TEXT, -- JSON array of userIds
  status TEXT DEFAULT 'active', -- 'active', 'hidden', 'deleted'
  isEdited INTEGER DEFAULT 0,
  moderationAction TEXT,
  originalContent TEXT,
  moderationWarning TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (authorId) REFERENCES users(id),
  FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indexes for optimal query performance
CREATE INDEX idx_comments_postId ON comments(postId, createdAt ASC);
CREATE INDEX idx_comments_authorId ON comments(authorId, createdAt DESC);
CREATE INDEX idx_comments_parentId ON comments(parentCommentId, createdAt ASC);
CREATE INDEX idx_comments_status ON comments(status);
```

## 12. Implementation Timeline

* **Phase**: SQLITE-015
* **Implementation Time**: ~6 hours (2025-10-29)
* **Test Development Time**: ~2 hours (43 tests)
* **Total Time**: ~8 hours
* **Lines of Code**: 689 lines (repository) + 43 tests
* **Status**: ✅ Completed with 100% test pass rate

---

**Document Version:** 2.0
**Last Updated:** 2025-11-30
**Changes in v2.0:**
- **CRITICAL UPDATE**: Documented migration from synchronous `better-sqlite3` to async Turso libSQL client
- Updated all function signatures to show `Promise<T>` return types
- Updated code examples to use `await` pattern
- Changed database operation descriptions from `stmt.run()`/`stmt.get()` to `await db.execute({ sql, args })`
- Updated Module Dependencies section to reflect `@libsql/client` dependency
