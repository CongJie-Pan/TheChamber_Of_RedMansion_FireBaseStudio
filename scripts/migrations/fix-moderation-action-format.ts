/**
 * Migration Script: Fix moderationAction Format in posts Table
 *
 * Problem: Database contains string values like "allow" which caused JSON.parse() errors
 * Solution: This script is now unnecessary - the repository code handles both formats
 *
 * This script is kept for documentation and can be used to standardize legacy JSON
 * format to string primitives if needed.
 */

import { getDatabase } from '@/lib/sqlite-db';

interface PostRow {
  id: string;
  moderationAction: string | null;
}

/**
 * Migrate moderationAction from legacy JSON format to string primitives
 * This is optional now that repository handles both formats
 */
export function migrateModerationActionFormat(dryRun: boolean = true): void {
  console.log('🔍 [Migration] Scanning posts with moderationAction field...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);

  const db = getDatabase();

  try {
    // Get all posts with non-null moderationAction
    const posts = db.prepare(`
      SELECT id, moderationAction
      FROM posts
      WHERE moderationAction IS NOT NULL
    `).all() as PostRow[];

    console.log(`   Found ${posts.length} posts with moderationAction field`);

    if (posts.length === 0) {
      console.log('✅ [Migration] No posts to migrate');
      return;
    }

    let alreadyString = 0;
    let needsMigration = 0;
    let failed = 0;
    const updates: { id: string; oldValue: string; newValue: string }[] = [];

    // Analyze each post
    for (const post of posts) {
      if (!post.moderationAction) continue;

      // Check if already a primitive string
      const validActions = ['allow', 'warn', 'filter', 'hide', 'block', 'flag-for-review'];
      if (validActions.includes(post.moderationAction)) {
        alreadyString++;
        continue;
      }

      // Attempt to parse as JSON
      try {
        const parsed = JSON.parse(post.moderationAction);

        // Extract action value from JSON object
        let action: string = 'allow'; // Default fallback

        if (typeof parsed === 'object' && parsed.action) {
          action = parsed.action;
        } else if (typeof parsed === 'string') {
          action = parsed;
        }

        // Validate extracted action
        if (!validActions.includes(action)) {
          console.warn(`   ⚠️  Post ${post.id}: Invalid action "${action}", using "allow" as fallback`);
          action = 'allow';
        }

        updates.push({
          id: post.id,
          oldValue: post.moderationAction,
          newValue: action
        });

        needsMigration++;
      } catch (error) {
        failed++;
        console.error(`   ❌ Post ${post.id}: Could not parse moderationAction:`, post.moderationAction);
      }
    }

    // Summary
    console.log('\n📊 [Migration] Analysis Results:');
    console.log(`   Already in string format: ${alreadyString}`);
    console.log(`   Need migration: ${needsMigration}`);
    console.log(`   Failed to parse: ${failed}`);

    // Execute updates if not dry run
    if (!dryRun && updates.length > 0) {
      console.log(`\n🔄 [Migration] Executing ${updates.length} updates...`);

      const stmt = db.prepare(`
        UPDATE posts
        SET moderationAction = ?
        WHERE id = ?
      `);

      let updated = 0;
      for (const update of updates) {
        try {
          stmt.run(update.newValue, update.id);
          updated++;
        } catch (error) {
          console.error(`   ❌ Failed to update post ${update.id}:`, error);
        }
      }

      console.log(`✅ [Migration] Successfully updated ${updated}/${updates.length} posts`);
    } else if (dryRun && updates.length > 0) {
      console.log('\n📋 [Migration] Planned Updates (DRY RUN):');
      updates.slice(0, 5).forEach(u => {
        console.log(`   Post ${u.id}:`);
        console.log(`     Old: ${u.oldValue}`);
        console.log(`     New: ${u.newValue}`);
      });
      if (updates.length > 5) {
        console.log(`   ... and ${updates.length - 5} more`);
      }
      console.log('\n💡 Run with dryRun=false to apply changes');
    }

    console.log('\n✅ [Migration] Complete');

  } catch (error) {
    console.error('❌ [Migration] Fatal error:', error);
    throw error;
  }
}

/**
 * CLI execution
 * Usage:
 *   npx tsx scripts/migrations/fix-moderation-action-format.ts        # Dry run
 *   npx tsx scripts/migrations/fix-moderation-action-format.ts --live # Execute migration
 */
if (require.main === module) {
  const isLive = process.argv.includes('--live');
  migrateModerationActionFormat(!isLive);
}
