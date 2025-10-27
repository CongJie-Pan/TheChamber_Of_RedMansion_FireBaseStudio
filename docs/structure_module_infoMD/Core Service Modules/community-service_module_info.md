# Module: `community-service.ts`

## 1. Module Summary

The `community-service` module provides comprehensive Firestore database operations for the Red Mansion community forum, managing posts, comments, likes, bookmarks, views, and real-time subscriptions with integrated content moderation. This module implements a complete social learning platform with threaded discussions, user interactions (like/unlike, bookmark), pagination, filtering (category, author, search), transactional like operations to prevent double-counting, automatic content filtering via `ContentFilterService`, moderation logging, and real-time listeners using Firestore `onSnapshot`. The service achieves 62.96% test coverage and is the central orchestrator for all community features.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/lib/firebase` - Firebase Firestore instance for database access.
  * `@/lib/content-filter-service` - Automated content moderation (integrated into all content creation).
* **External Dependencies:**
  * `firebase/firestore` - Firestore operations (CRUD, queries, transactions, real-time listeners).

## 3. Public API / Exports

* `CommunityService` - Main service class with all community operations.
* `communityService: CommunityService` - Singleton instance exported for application-wide use.
* **Type Exports:**
  * `CommunityPost` - Post interface with all fields (id, author, title, content, tags, likes, comments, views, bookmarks, moderation).
  * `PostComment` - Comment interface with nested replies support.
  * `CreatePostData` - Input data for creating posts.
  * `CreateCommentData` - Input data for creating comments.
  * `PostFilters` - Query filters (category, tags, author, searchText).
  * `CreateContentResult` - Result of content creation with ID and moderation action.
* **CommunityService Methods:**
  * `createPost(postData: CreatePostData): Promise<CreateContentResult>` - Creates post with content filtering.
  * `getPosts(filters?: PostFilters, limitCount?: number, lastDoc?: any): Promise<CommunityPost[]>` - Fetches posts with pagination.
  * `getPost(postId: string): Promise<CommunityPost | null>` - Fetches single post by ID.
  * `togglePostLike(postId: string, userId: string, isLiking: boolean): Promise<boolean>` - Likes/unlikes post (transactional).
  * `incrementViewCount(postId: string): Promise<boolean>` - Increments view count.
  * `addComment(commentData: CreateCommentData): Promise<CreateContentResult>` - Adds comment with filtering.
  * `getComments(postId: string, limitCount?: number): Promise<PostComment[]>` - Fetches comments for post.
  * `setupPostsListener(callback: (posts) => void, filters?: PostFilters): () => void` - Real-time posts subscription.
  * `setupCommentsListener(postId: string, callback: (comments) => void): () => void` - Real-time comments subscription.
  * `addBookmark(postId: string, userId: string): Promise<void>` - Adds user bookmark.
  * `removeBookmark(postId: string, userId: string): Promise<void>` - Removes user bookmark.
  * `getBookmarkedPosts(userId: string): Promise<CommunityPost[]>` - Fetches user's bookmarked posts.
  * `updatePostStatus(postId: string, status: 'active' | 'hidden' | 'deleted'): Promise<void>` - Updates post status (moderation).
  * `deletePost(postId: string): Promise<void>` - Permanently deletes post.
  * `deleteComment(postId: string, commentId: string): Promise<void>` - Permanently deletes comment.

## 4. Code File Breakdown

### 4.1. `community-service.ts`

* **Purpose:** Provides the complete backend logic for the Red Mansion community forum, enabling scholarly discussions about classical Chinese literature. The module's architectural highlights include: (1) **Integrated content moderation** - All `createPost` and `addComment` operations automatically pass through `ContentFilterService` before saving to Firestore, with filtered content stored and original content preserved for review; (2) **Transactional integrity** - Like operations use Firestore `runTransaction` to prevent race conditions and ensure accurate like counts by checking `likedBy` array before incrementing/decrementing; (3) **Real-time collaboration** - `setupPostsListener` and `setupCommentsListener` enable live updates using Firestore `onSnapshot`, allowing users to see new posts and comments without refreshing; (4) **Flexible querying** - Supports filtering by category, author, tags, with client-side search for text matching (Firestore doesn't support full-text search natively); (5) **Bookmark system** - Uses Firestore `arrayUnion`/`arrayRemove` for efficient bookmark management with `bookmarkedBy` array queries.
* **Functions:**
    * `createPost(postData: CreatePostData): Promise<CreateContentResult>` - **Content creation with filtering**. Combines title and content for filtering. Calls `contentFilterService.processContent` with temp ID. Throws error with warning message if `shouldBlock=true`. Splits filtered content back into title and content if modified. Creates post document with: filtered data, initial counts (likes=0, comments=0, views=0), timestamps, status='active', bookmarkedBy=[], moderation fields (action, originalContent if different, warning). Adds to Firestore `posts` collection. Re-processes with actual post ID for moderation log correction. Returns post ID and moderation action. Throws user-friendly error if content blocked or creation fails.
    * `getPosts(filters?: PostFilters, limitCount=20, lastDoc?: any): Promise<CommunityPost[]>` - **Query with filters and pagination**. Builds Firestore query with: `where('status', '==', 'active')`, `orderBy('createdAt', 'desc')`, `limit(limitCount)`. Adds optional filters: category (where clause), authorId (where clause), pagination (startAfter lastDoc). Executes query with `getDocs`. Maps documents to `CommunityPost` objects with timestamps. Applies client-side text search filter if `searchText` provided (searches in content, authorName, tags). Returns posts array. Throws on error.
    * `getPost(postId: string): Promise<CommunityPost | null>` - Fetches single post using `getDoc(doc(postsCollection, postId))`. Returns null if document doesn't exist. Maps document data to `CommunityPost` with timestamps. Throws on error.
    * `togglePostLike(postId: string, userId: string, isLiking: boolean): Promise<boolean>` - **Transactional like/unlike**. Uses `runTransaction` to ensure atomicity. Reads current post within transaction. Checks if userId is in `likedBy` array. If `isLiking=true` and not currently liked: updates with `increment(1)` for likes, `arrayUnion(userId)` for likedBy, serverTimestamp for updatedAt; returns true. If `isLiking=false` and currently liked: updates with `increment(-1)` for likes, `arrayRemove(userId)` for likedBy, serverTimestamp; returns true. Returns false if already in desired state (no-op). Throws on error. Prevents duplicate likes and negative like counts.
    * `incrementViewCount(postId: string): Promise<boolean>` - Updates post with `increment(1)` for viewCount, serverTimestamp for updatedAt. Returns true on success, false on error (non-critical operation, does not throw).
    * `addComment(commentData: CreateCommentData): Promise<CreateContentResult>` - **Comment creation with filtering**. Calls `contentFilterService.processContent` with temp ID. Throws error if `shouldBlock=true`. Gets comments sub-collection: `collection(db, 'posts', postId, 'comments')`. Creates comment document with: filtered content, initial likes=0, likedBy=[], timestamps, status='active', moderation fields. Adds to comments sub-collection. Re-processes with actual comment ID for log correction. Updates parent post: `increment(1)` for commentCount, serverTimestamp. Returns comment ID and moderation action. Throws user-friendly error if blocked or fails.
    * `getComments(postId: string, limitCount=50): Promise<PostComment[]>` - Gets comments sub-collection for post. Builds query with: `where('status', '==', 'active')`, `orderBy('createdAt', 'asc')` (chronological order), `limit(limitCount)`. Executes query with `getDocs`. Maps documents to `PostComment` objects with postId and timestamps. Returns comments array. Throws on error.
    * `setupPostsListener(callback: (posts) => void, filters?: PostFilters): () => void` - **Real-time posts subscription**. Builds query with: status='active', orderBy createdAt desc, limit=20. Adds category filter if provided. Calls `onSnapshot` with query, callback, and error handler. Callback receives posts array on every database change. Returns unsubscribe function. Logs errors to console.
    * `setupCommentsListener(postId: string, callback: (comments) => void): () => void` - **Real-time comments subscription**. Gets comments sub-collection for post. Builds query with: status='active', orderBy createdAt asc. Calls `onSnapshot` with query and callback. Returns unsubscribe function. Logs errors to console.
    * `addBookmark(postId: string, userId: string): Promise<void>` - Updates post with `arrayUnion(userId)` for bookmarkedBy, serverTimestamp. Adds userId to post's bookmarkedBy array (no duplicates). Throws on error.
    * `removeBookmark(postId: string, userId: string): Promise<void>` - Updates post with `arrayRemove(userId)` for bookmarkedBy, serverTimestamp. Removes userId from bookmarkedBy array. Throws on error.
    * `getBookmarkedPosts(userId: string): Promise<CommunityPost[]>` - **Bookmark query**. Queries posts with: `where('bookmarkedBy', 'array-contains', userId)`, `where('status', '==', 'active')`, `orderBy('createdAt', 'desc')`. Returns posts bookmarked by user. Maps documents to `CommunityPost` array. Throws on error.
    * `updatePostStatus(postId: string, status: 'active' | 'hidden' | 'deleted'): Promise<void>` - Updates post with new status and serverTimestamp. Used for moderation actions. Throws on error. Note: Should have admin authorization check in production.
    * `deletePost(postId: string): Promise<void>` - Permanently deletes post document using `deleteDoc`. **Warning**: Does NOT delete sub-collections (comments) automatically. Requires recursive delete for complete removal. Throws on error.
    * `deleteComment(postId: string, commentId: string): Promise<void>` - Deletes comment document from sub-collection using `deleteDoc`. Updates parent post: `increment(-1)` for commentCount, serverTimestamp. Throws on error.
* **Key Classes / Constants / Variables:**
    * `CommunityService` - Main service class. Holds `postsCollection = collection(db, 'posts')` reference.
    * `CommunityPost: interface` - Comprehensive post type with 17 fields: id, authorId, authorName, title (optional), content, tags array, likes count, likedBy array (user IDs), commentCount, viewCount, createdAt timestamp, updatedAt timestamp, isEdited boolean, category (optional), status enum, bookmarkedBy array (user IDs), moderationAction (optional), originalContent (optional for filtering), moderationWarning (optional).
    * `PostComment: interface` - Comment type with 14 fields: id, postId, authorId, authorName, content, likes, likedBy, parentCommentId (optional for nested replies), createdAt, updatedAt, isEdited, status, moderation fields.
    * `CreateContentResult: interface` - Return type for content creation with 2 fields: id (created document ID), moderationAction (allow/warn/filter/hide/block/flag-for-review).

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: createPost] --> B[Combine title + content];
    B --> C[Call contentFilterService.processContent];
    C --> D{shouldBlock?};
    D -- Yes --> E[Throw error with warning message];
    D -- No --> F[Split filtered content back to title + content];
    F --> G[Create post document with filtered data];
    G --> H[Add to Firestore posts collection];
    H --> I[Re-process with actual post ID for log];
    I --> J[Return post ID + moderation action];
    E --> K[End];
    J --> K;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input1(CreatePostData: title, content, tags) --> Filter[contentFilterService.processContent];
    Filter --> Decision{shouldBlock?};
    Decision -- Yes --> Reject[Throw error];
    Decision -- No --> PostDoc[Post document with filtered content];
    PostDoc --> Firestore[(Firestore posts collection)];
    Firestore --> Log[Moderation log with actual ID];
    PostDoc --> Output(CreateContentResult: id, moderationAction);
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { communityService } from '@/lib/community-service';

// Create post with automatic filtering
const result = await communityService.createPost({
  authorId: user.uid,
  authorName: user.displayName,
  title: '林黛玉的性格分析',
  content: '我認為林黛玉的性格特點包括...',
  tags: ['角色分析', '林黛玉', '性格'],
  category: 'character-analysis'
});

if (result.moderationAction === 'filter') {
  showWarning('您的內容包含不當用語，已自動過濾。');
}
console.log('Post created:', result.id);

// Get posts with filtering
const posts = await communityService.getPosts({
  category: 'character-analysis',
  searchText: '林黛玉'
}, 20);

// Like/unlike post (transactional)
const likeSuccess = await communityService.togglePostLike(postId, user.uid, true);

// Real-time posts listener
const unsubscribe = communityService.setupPostsListener((posts) => {
  setPosts(posts); // Update UI with latest posts
}, { category: 'character-analysis' });

// Clean up listener
useEffect(() => {
  return () => unsubscribe();
}, []);

// Add comment with filtering
const commentResult = await communityService.addComment({
  postId: post.id,
  authorId: user.uid,
  authorName: user.displayName,
  content: '我同意您的觀點，林黛玉確實...'
});

// Get comments
const comments = await communityService.getComments(postId);

// Bookmark management
await communityService.addBookmark(postId, user.uid);
const bookmarked = await communityService.getBookmarkedPosts(user.uid);
```
* **Testing:** Tested via `tests/lib/community-service.test.ts` with 29 integration tests achieving 62.96% coverage:
  - Test post creation with valid data
  - Test post creation blocks inappropriate content
  - Test post creation stores moderation fields
  - Test getPosts returns posts ordered by createdAt desc
  - Test getPosts filters by category
  - Test getPosts filters by author
  - Test client-side search filters by text
  - Test getPost returns single post by ID
  - Test togglePostLike increments likes and adds to likedBy
  - Test togglePostLike decrements likes and removes from likedBy
  - Test togglePostLike is idempotent (no double-like)
  - Test togglePostLike uses transaction (concurrent safe)
  - Test incrementViewCount increments view count
  - Test addComment creates comment with filtering
  - Test addComment blocks inappropriate content
  - Test addComment increments parent post commentCount
  - Test getComments returns comments ordered chronologically
  - Test setupPostsListener receives real-time updates
  - Test setupCommentsListener receives real-time updates
  - Test addBookmark adds userId to bookmarkedBy
  - Test removeBookmark removes userId from bookmarkedBy
  - Test getBookmarkedPosts queries by bookmarkedBy array
  - Test updatePostStatus changes post status
  - Test deletePost removes post document
  - Test deleteComment removes comment and decrements count
  - Test error handling throws user-friendly messages
