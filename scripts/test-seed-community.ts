/**
 * @fileOverview Test Data Seeding Script for Community Features
 *
 * Creates test posts and comments for debugging community functionality
 *
 * **⚠️ WARNING: FOR TESTING ONLY - DELETE AFTER DEBUGGING**
 *
 * Usage:
 *   npx tsx scripts/test-seed-community.ts
 *
 * @created 2025-11-01
 */

import { getDatabase } from '../src/lib/sqlite-db';

console.log('\n' + '='.repeat(80));
console.log('🌱 Test Community Data Seeding Script');
console.log('='.repeat(80));

async function seedTestData() {
  try {
    console.log('🗄️  Getting database instance...');
    const db = await getDatabase();
    console.log('✅ Database instance obtained');

    console.log('\n📝 Creating test data...');

    // Create test user
    console.log('👤 Creating test user...');
    const userExistsResult = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: ['test-user-1']
    });
    const userExists = userExistsResult.rows[0];

    if (!userExists) {
      await db.execute({
        sql: `
          INSERT INTO users (
            id, username, email, currentLevel, currentXP, totalXP,
            attributes, completedTasks, unlockedContent, completedChapters,
            hasReceivedWelcomeBonus, stats, createdAt, updatedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          'test-user-1',
          '測試用戶',
          'test@example.com',
          1, // level
          0, // currentXP
          0, // totalXP
          '{}', // attributes
          '[]', // completedTasks
          '[]', // unlockedContent
          '[]', // completedChapters
          0, // hasReceivedWelcomeBonus
          '{}', // stats
          Date.now(),
          Date.now()
        ]
      });
      console.log('✅ Test user created: test-user-1');
    } else {
      console.log('ℹ️  Test user already exists: test-user-1');
    }

    // Create test posts
    console.log('\n📄 Creating test posts...');
    const testPosts = [
      {
        id: 'test-post-1',
        title: '測試貼文 1',
        content: '這是第一個測試貼文的內容。用於測試評論功能。',
      },
      {
        id: 'test-post-2',
        title: '測試貼文 2',
        content: '這是第二個測試貼文的內容。用於測試多個貼文的評論。',
      },
    ];

    for (const post of testPosts) {
      const postExistsResult = await db.execute({
        sql: 'SELECT id FROM posts WHERE id = ?',
        args: [post.id]
      });
      const postExists = postExistsResult.rows[0];

      if (!postExists) {
        await db.execute({
          sql: `
            INSERT INTO posts (
              id, authorId, authorName, title, content, tags,
              likes, likedBy, bookmarkedBy, commentCount, viewCount,
              status, isEdited, createdAt, updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            post.id,
            'test-user-1',
            '測試用戶',
            post.title,
            post.content,
            '["測試","調試"]', // tags
            0, // likes
            '[]', // likedBy
            '[]', // bookmarkedBy
            0, // commentCount
            0, // viewCount
            'active',
            0, // isEdited
            Date.now(),
            Date.now()
          ]
        });
        console.log(`✅ Post created: ${post.id} - ${post.title}`);
      } else {
        console.log(`ℹ️  Post already exists: ${post.id}`);
      }
    }

    // Create test comments
    console.log('\n💬 Creating test comments...');
    const testComments = [
      {
        id: 'test-comment-1',
        postId: 'test-post-1',
        content: '這是第一個測試評論',
      },
      {
        id: 'test-comment-2',
        postId: 'test-post-1',
        content: '這是第二個測試評論',
      },
      {
        id: 'test-comment-3',
        postId: 'test-post-2',
        content: '在第二個貼文下的測試評論',
      },
    ];

    for (const comment of testComments) {
      const commentExistsResult = await db.execute({
        sql: 'SELECT id FROM comments WHERE id = ?',
        args: [comment.id]
      });
      const commentExists = commentExistsResult.rows[0];

      if (!commentExists) {
        await db.execute({
          sql: `
            INSERT INTO comments (
              id, postId, authorId, authorName, content, parentCommentId,
              depth, replyCount, likes, likedBy,
              status, isEdited, createdAt, updatedAt
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            comment.id,
            comment.postId,
            'test-user-1',
            '測試用戶',
            comment.content,
            null, // parentCommentId
            0, // depth
            0, // replyCount
            0, // likes
            '[]', // likedBy
            'active',
            0, // isEdited
            Date.now(),
            Date.now()
          ]
        });
        console.log(`✅ Comment created: ${comment.id} on ${comment.postId}`);
      } else {
        console.log(`ℹ️  Comment already exists: ${comment.id}`);
      }
    }

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');

    const userCountResult = await db.execute('SELECT COUNT(*) as count FROM users');
    const userCount = userCountResult.rows[0] as unknown as { count: number };

    const postCountResult = await db.execute('SELECT COUNT(*) as count FROM posts');
    const postCount = postCountResult.rows[0] as unknown as { count: number };

    const commentCountResult = await db.execute('SELECT COUNT(*) as count FROM comments');
    const commentCount = commentCountResult.rows[0] as unknown as { count: number };

    console.log(`👤 Total users: ${userCount.count}`);
    console.log(`📄 Total posts: ${postCount.count}`);
    console.log(`💬 Total comments: ${commentCount.count}`);

    console.log('\n✅ Test data seeding completed successfully!');
    console.log('\n📝 You can now test with:');
    console.log('   - Post ID: test-post-1');
    console.log('   - Post ID: test-post-2');
    console.log('   - User ID: test-user-1');
    console.log('='.repeat(80) + '\n');

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ Error during test data seeding');
    console.error('='.repeat(80));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('='.repeat(80) + '\n');
    process.exit(1);
  }
}

// Run the async function
seedTestData();
