#!/usr/bin/env npx tsx
/**
 * Task 4.9: Migration Script - Link Existing Notes and Posts
 *
 * This script retroactively links existing notes and community posts
 * by matching content patterns and user IDs.
 *
 * Strategy:
 * 1. Find all posts that contain note content patterns (「選取文字」, 來源, 我的閱讀筆記)
 * 2. For each note post, try to find the matching note by:
 *    - Same user ID
 *    - Similar content or selected text
 *    - Created around the same time
 * 3. Establish bi-directional links:
 *    - notes.sharedPostId → posts.id
 *    - posts.sourceNoteId → notes.id
 *
 * Usage:
 *   npx tsx scripts/migrations/task-4.9-link-notes-posts.ts
 *
 * Or with dry-run (preview only):
 *   npx tsx scripts/migrations/task-4.9-link-notes-posts.ts --dry-run
 *
 * @phase Task 4.9 - Note-Post Sync
 * @created 2025-11-29
 */

import { getDatabase } from '../../src/lib/sqlite-db';

interface NoteRow {
  id: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  createdAt: number;
  sharedPostId: string | null;
}

interface PostRow {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
  sourceNoteId: string | null;
}

interface LinkCandidate {
  noteId: string;
  postId: string;
  userId: string;
  matchScore: number;
  reason: string;
}

/**
 * Check if a post appears to be from a shared note
 */
function isNotePost(content: string): boolean {
  return (
    (content.includes('我的閱讀筆記') && content.includes('來源：')) ||
    content.includes('選取文字：') ||
    content.startsWith('「') && content.includes('」\n\n')
  );
}

/**
 * Extract selected text from post content
 */
function extractSelectedText(content: string): string | null {
  // Try new format: 「text」
  const quoteMatch = content.match(/「([^」]+)」/);
  if (quoteMatch) return quoteMatch[1].trim();

  // Try old format: 選取文字：text
  const labelMatch = content.match(/選取文字[：:]\s*(.+?)(?:\n|$)/);
  if (labelMatch) return labelMatch[1].trim();

  return null;
}

/**
 * Calculate similarity score between two strings (0-1)
 * Using simple word overlap for now
 */
function calculateSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Find matching note for a post
 */
function findMatchingNote(post: PostRow, userNotes: NoteRow[]): LinkCandidate | null {
  if (!isNotePost(post.content)) return null;

  const postSelectedText = extractSelectedText(post.content);

  let bestMatch: LinkCandidate | null = null;
  let bestScore = 0;

  for (const note of userNotes) {
    // Skip if already linked to another post
    if (note.sharedPostId) continue;

    let score = 0;
    let reason = '';

    // Check selected text match (highest weight)
    if (postSelectedText && note.selectedText) {
      const textSimilarity = calculateSimilarity(postSelectedText, note.selectedText);
      if (textSimilarity > 0.5) {
        score += textSimilarity * 50;
        reason += `selectedText match (${Math.round(textSimilarity * 100)}%); `;
      }
    }

    // Check note content in post (medium weight)
    if (note.note && post.content.includes(note.note.substring(0, 50))) {
      score += 30;
      reason += 'noteContent in post; ';
    }

    // Check creation time proximity (lower weight)
    const timeDiffHours = Math.abs(post.createdAt - note.createdAt) / (1000 * 60 * 60);
    if (timeDiffHours < 1) {
      score += 20;
      reason += 'created within 1 hour; ';
    } else if (timeDiffHours < 24) {
      score += 10;
      reason += 'created within 24 hours; ';
    }

    if (score > bestScore && score >= 30) {
      bestScore = score;
      bestMatch = {
        noteId: note.id!,
        postId: post.id,
        userId: post.authorId,
        matchScore: score,
        reason: reason.trim(),
      };
    }
  }

  return bestMatch;
}

async function runMigration(dryRun: boolean = false) {
  console.log('========================================');
  console.log('Task 4.9: Link Notes and Posts Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  console.log('========================================\n');

  const db = getDatabase();

  // Step 1: Check if columns exist (migration already applied to schema)
  console.log('Step 1: Checking schema...');

  // Step 2: Get all posts that look like note posts and are not already linked
  console.log('\nStep 2: Finding unlinked note posts...');
  const postsResult = await db.execute({
    sql: `
      SELECT id, authorId, content, createdAt, sourceNoteId
      FROM posts
      WHERE status = 'active'
      AND sourceNoteId IS NULL
      ORDER BY createdAt DESC
    `,
    args: []
  });
  const posts = postsResult.rows as unknown as PostRow[];

  const notePosts = posts.filter(p => isNotePost(p.content));
  console.log(`Found ${notePosts.length} potential note posts out of ${posts.length} total posts`);

  // Step 3: Get all notes grouped by user
  console.log('\nStep 3: Loading notes by user...');
  const notesResult = await db.execute({
    sql: `
      SELECT id, userId, chapterId, selectedText, note, createdAt, sharedPostId
      FROM notes
      ORDER BY createdAt DESC
    `,
    args: []
  });
  const allNotes = notesResult.rows as unknown as NoteRow[];

  // Group notes by user
  const notesByUser = new Map<string, NoteRow[]>();
  for (const note of allNotes) {
    if (!notesByUser.has(note.userId)) {
      notesByUser.set(note.userId, []);
    }
    notesByUser.get(note.userId)!.push(note);
  }
  console.log(`Loaded ${allNotes.length} notes from ${notesByUser.size} users`);

  // Step 4: Find matches
  console.log('\nStep 4: Finding matches...');
  const candidates: LinkCandidate[] = [];

  for (const post of notePosts) {
    const userNotes = notesByUser.get(post.authorId) || [];
    const match = findMatchingNote(post, userNotes);
    if (match) {
      candidates.push(match);
    }
  }

  console.log(`Found ${candidates.length} matching pairs`);

  // Step 5: Display or apply links
  if (candidates.length === 0) {
    console.log('\nNo matches found. Migration complete.');
    return;
  }

  console.log('\n========================================');
  console.log('Match Results:');
  console.log('========================================');

  for (const candidate of candidates) {
    console.log(`\n- Note: ${candidate.noteId}`);
    console.log(`  Post: ${candidate.postId}`);
    console.log(`  User: ${candidate.userId}`);
    console.log(`  Score: ${candidate.matchScore}`);
    console.log(`  Reason: ${candidate.reason}`);
  }

  if (dryRun) {
    console.log('\n========================================');
    console.log('DRY RUN complete. No changes made.');
    console.log('Run without --dry-run to apply changes.');
    console.log('========================================');
    return;
  }

  // Step 6: Apply links
  console.log('\n========================================');
  console.log('Applying links...');
  console.log('========================================');

  let successCount = 0;
  let errorCount = 0;

  for (const candidate of candidates) {
    try {
      // Update note with sharedPostId
      await db.execute({
        sql: `UPDATE notes SET sharedPostId = ? WHERE id = ?`,
        args: [candidate.postId, candidate.noteId]
      });

      // Update post with sourceNoteId
      await db.execute({
        sql: `UPDATE posts SET sourceNoteId = ? WHERE id = ?`,
        args: [candidate.noteId, candidate.postId]
      });

      console.log(`✅ Linked note ${candidate.noteId} ↔ post ${candidate.postId}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Failed to link note ${candidate.noteId} ↔ post ${candidate.postId}:`, error);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('Migration Complete!');
  console.log(`✅ Successfully linked: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('========================================');
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

runMigration(dryRun).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
