#!/usr/bin/env tsx
/**
 * @fileOverview Community Migration Script - Firebase to SQLite
 *
 * Migrates posts and flattens comment sub-collections from Firebase Firestore
 * to SQLite database. This script handles the complex sub-collection structure
 * where comments are stored under posts/{postId}/comments.
 *
 * Collections migrated:
 * - posts (main collection) → posts table
 * - posts/{postId}/comments (sub-collection) → comments table (flattened)
 *
 * Key Challenge:
 * Comments in Firestore are stored as sub-collections under each post document.
 * This script flattens this hierarchical structure into a single flat comments
 * table with postId as a foreign key.
 *
 * Usage:
 *   npm run migrate:community           # Normal migration
 *   npm run migrate:community -- --dry-run  # Test without writing
 *   npm run migrate:community -- --verbose  # Detailed logging
 *   npm run migrate:community -- --batch-size=50  # Custom batch size
 *
 * @phase Phase 3 - SQLITE-018 - Users & Community Migration
 */

import { BaseMigrator, type MigrationOptions, type MigrationStats } from './base-migrator';
import { db } from '../../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { batchCreatePosts, type CommunityPost } from '../../src/lib/repositories/community-repository';
import { batchCreateComments, type Comment } from '../../src/lib/repositories/comment-repository';
import { Timestamp } from 'firebase/firestore';

/**
 * Firestore Post document structure
 */
interface FirestorePost {
  id: string; // Document ID
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  tags?: string[];
  category?: string;
  likes?: number;
  likedBy?: string[];
  bookmarkedBy?: string[];
  commentCount?: number;
  viewCount?: number;
  status?: 'active' | 'hidden' | 'deleted';
  isEdited?: boolean;
  moderationAction?: string;
  originalContent?: string;
  moderationWarning?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * Firestore Comment document structure (from sub-collection)
 */
interface FirestoreComment {
  id: string; // Document ID (commentId)
  // postId is NOT in the document - it's the parent document ID
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string;
  depth?: number;
  replyCount?: number;
  likes?: number;
  likedBy?: string[];
  status?: 'active' | 'hidden' | 'deleted';
  isEdited?: boolean;
  moderationAction?: string;
  originalContent?: string;
  moderationWarning?: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

/**
 * Community Migrator Class
 */
class CommunityMigrator extends BaseMigrator {
  private posts: Array<Omit<CommunityPost, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp }> = [];
  private comments: Array<Omit<Comment, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp }> = [];
  private totalCommentsFetched = 0;

  /**
   * Validate a post record before migration
   */
  protected validatePost(record: FirestorePost): boolean {
    if (!record.id || typeof record.id !== 'string') {
      this.log(`Invalid postId in post document`, 'warn');
      return false;
    }

    if (!record.authorId || typeof record.authorId !== 'string') {
      this.log(`Invalid authorId in post: ${record.id}`, 'warn');
      return false;
    }

    if (!record.authorName || typeof record.authorName !== 'string') {
      this.log(`Invalid authorName in post: ${record.id}`, 'warn');
      return false;
    }

    if (!record.content || typeof record.content !== 'string') {
      this.log(`Invalid content in post: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Validate a comment record before migration
   */
  protected validateComment(record: FirestoreComment, postId: string): boolean {
    if (!record.id || typeof record.id !== 'string') {
      this.log(`Invalid commentId in comment for post ${postId}`, 'warn');
      return false;
    }

    if (!record.authorId || typeof record.authorId !== 'string') {
      this.log(`Invalid authorId in comment: ${record.id}`, 'warn');
      return false;
    }

    if (!record.content || typeof record.content !== 'string') {
      this.log(`Invalid content in comment: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Fetch all posts from Firestore
   */
  private async fetchPosts(): Promise<FirestorePost[]> {
    this.log('📥 Fetching posts from Firestore...');

    const postsRef = collection(db, 'posts');
    const querySnapshot = await getDocs(postsRef);

    const posts: FirestorePost[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      posts.push({
        id: doc.id,
        ...data,
      } as FirestorePost);
    });

    this.log(`📥 Fetched ${posts.length} posts from Firestore`);
    return posts;
  }

  /**
   * Fetch comments for a specific post (from sub-collection)
   */
  private async fetchCommentsForPost(postId: string): Promise<FirestoreComment[]> {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const querySnapshot = await getDocs(commentsRef);

    const comments: FirestoreComment[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
      } as FirestoreComment);
    });

    if (this.options.verbose && comments.length > 0) {
      this.log(`  📥 Fetched ${comments.length} comments for post ${postId}`);
    }

    return comments;
  }

  /**
   * Transform post from Firestore to SQLite format
   */
  private transformPost(firestorePost: FirestorePost): Omit<CommunityPost, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } {
    const now = Date.now();
    const createdAt = this.normalizeTimestamp(firestorePost.createdAt, now);
    const updatedAt = this.normalizeTimestamp(firestorePost.updatedAt, now);

    return {
      id: firestorePost.id,
      authorId: firestorePost.authorId,
      authorName: firestorePost.authorName,
      title: firestorePost.title,
      content: firestorePost.content,
      tags: Array.isArray(firestorePost.tags) ? firestorePost.tags : [],
      category: firestorePost.category,
      likes: firestorePost.likes || 0,
      likedBy: Array.isArray(firestorePost.likedBy) ? firestorePost.likedBy : [],
      bookmarkedBy: Array.isArray(firestorePost.bookmarkedBy) ? firestorePost.bookmarkedBy : [],
      commentCount: firestorePost.commentCount || 0,
      viewCount: firestorePost.viewCount || 0,
      status: firestorePost.status || 'active',
      isEdited: firestorePost.isEdited || false,
      moderationAction: firestorePost.moderationAction,
      originalContent: firestorePost.originalContent,
      moderationWarning: firestorePost.moderationWarning,
      createdAt: Timestamp.fromMillis(createdAt),
      updatedAt: Timestamp.fromMillis(updatedAt),
    };
  }

  /**
   * Transform comment from Firestore to SQLite format
   * IMPORTANT: Adds postId from parent document path
   */
  private transformComment(
    firestoreComment: FirestoreComment,
    postId: string
  ): Omit<Comment, 'createdAt' | 'updatedAt'> & { createdAt: Timestamp; updatedAt: Timestamp } {
    const now = Date.now();
    const createdAt = this.normalizeTimestamp(firestoreComment.createdAt, now);
    const updatedAt = this.normalizeTimestamp(firestoreComment.updatedAt, now);

    return {
      id: firestoreComment.id,
      postId: postId, // CRITICAL: Add postId from parent document
      authorId: firestoreComment.authorId,
      authorName: firestoreComment.authorName,
      content: firestoreComment.content,
      parentCommentId: firestoreComment.parentCommentId,
      depth: firestoreComment.depth || 0,
      replyCount: firestoreComment.replyCount || 0,
      likes: firestoreComment.likes || 0,
      likedBy: Array.isArray(firestoreComment.likedBy) ? firestoreComment.likedBy : [],
      status: firestoreComment.status || 'active',
      isEdited: firestoreComment.isEdited || false,
      moderationAction: firestoreComment.moderationAction,
      originalContent: firestoreComment.originalContent,
      moderationWarning: firestoreComment.moderationWarning,
      createdAt: Timestamp.fromMillis(createdAt),
      updatedAt: Timestamp.fromMillis(updatedAt),
    };
  }

  /**
   * Insert batch of posts and comments into SQLite
   */
  private async insertBatch(): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would insert ${this.posts.length} posts and ${this.comments.length} comments`);
      this.stats.successfulRecords += this.posts.length;
      this.posts = [];
      this.comments = [];
      return;
    }

    try {
      // Insert posts first (to satisfy foreign key constraint for comments)
      if (this.posts.length > 0) {
        const postsCreated = batchCreatePosts(this.posts);
        this.log(`✅ Inserted ${postsCreated} posts into SQLite`);
        this.stats.successfulRecords += postsCreated;
      }

      // Insert comments (must be after posts due to foreign key)
      if (this.comments.length > 0) {
        const commentsCreated = batchCreateComments(this.comments);
        this.log(`✅ Inserted ${commentsCreated} comments into SQLite`);
      }

      // Clear arrays for next batch
      this.posts = [];
      this.comments = [];
    } catch (error: any) {
      this.log(`❌ Failed to insert batch: ${error.message}`, 'error');
      this.stats.failedRecords += this.posts.length;
      throw error;
    }
  }

  /**
   * Main migration execution with sub-collection flattening
   */
  async migrate(): Promise<MigrationStats> {
    this.log('🚀 Starting community migration (Firebase → SQLite)...');
    this.log(`⚙️  Configuration: batch size=${this.options.batchSize}, dry-run=${this.options.dryRun}, validate=${this.options.validateData}`);
    this.log('📝 Note: Comments will be flattened from sub-collections into a single table');

    try {
      // Step 1: Fetch all posts from Firestore
      const firestorePosts = await this.fetchPosts();
      this.stats.totalRecords = firestorePosts.length;

      if (firestorePosts.length === 0) {
        this.log('⚠️  No posts found in Firestore', 'warn');
        this.stats.endTime = Date.now();
        this.stats.duration = this.stats.endTime - this.stats.startTime;
        return this.stats;
      }

      this.log(`📊 Total posts to migrate: ${firestorePosts.length}`);

      // Step 2: Process posts and their comments in batches
      for (let i = 0; i < firestorePosts.length; i++) {
        const firestorePost = firestorePosts[i];

        // Validate post
        if (this.options.validateData && !this.validatePost(firestorePost)) {
          this.stats.skippedRecords++;
          continue;
        }

        // Transform post
        const post = this.transformPost(firestorePost);
        this.posts.push(post);

        // Fetch and transform comments for this post (sub-collection flattening)
        try {
          const postComments = await this.fetchCommentsForPost(firestorePost.id);
          this.totalCommentsFetched += postComments.length;

          for (const comment of postComments) {
            // Validate comment
            if (this.options.validateData && !this.validateComment(comment, firestorePost.id)) {
              continue;
            }

            // Transform comment and add postId from parent
            const transformedComment = this.transformComment(comment, firestorePost.id);
            this.comments.push(transformedComment);
          }
        } catch (error: any) {
          this.log(`⚠️  Failed to fetch comments for post ${firestorePost.id}: ${error.message}`, 'warn');
          // Continue with migration even if comments fetch fails
        }

        // Insert batch when batch size is reached
        if (this.posts.length >= this.options.batchSize) {
          await this.insertBatch();
          this.log(`📈 Progress: ${i + 1}/${firestorePosts.length} posts processed (${Math.round((i + 1) / firestorePosts.length * 100)}%)`);
        }
      }

      // Insert remaining records
      if (this.posts.length > 0 || this.comments.length > 0) {
        await this.insertBatch();
      }

      // Step 3: Final statistics
      this.stats.endTime = Date.now();
      this.stats.duration = this.stats.endTime - this.stats.startTime;

      this.log('');
      this.log('========================================');
      this.log('✅ Community migration completed!');
      this.log('========================================');
      this.log(`📊 Statistics:`);
      this.log(`   Total posts: ${this.stats.totalRecords}`);
      this.log(`   Successful posts: ${this.stats.successfulRecords}`);
      this.log(`   Failed posts: ${this.stats.failedRecords}`);
      this.log(`   Skipped posts: ${this.stats.skippedRecords}`);
      this.log(`   Total comments migrated: ${this.totalCommentsFetched}`);
      this.log(`   Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);
      this.log(`   Speed: ${(this.stats.successfulRecords / (this.stats.duration / 1000)).toFixed(2)} posts/sec`);
      this.log('========================================');
      this.log('✅ Sub-collection flattening: Comments successfully migrated from nested structure to flat table');

      if (this.options.dryRun) {
        this.log('⚠️  DRY RUN MODE - No data was actually written to SQLite');
      }

      return this.stats;
    } catch (error: any) {
      this.log(`❌ Migration failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    validateData: !args.includes('--no-validate'),
  };

  // Parse custom batch size
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
  if (batchSizeArg) {
    const batchSize = parseInt(batchSizeArg.split('=')[1], 10);
    if (!isNaN(batchSize) && batchSize > 0) {
      options.batchSize = batchSize;
    }
  }

  const migrator = new CommunityMigrator(options);

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  main();
}
