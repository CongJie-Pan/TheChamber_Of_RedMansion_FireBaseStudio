#!/usr/bin/env tsx
/**
 * @fileOverview Notes Migration Script - Firebase to SQLite
 *
 * Migrates all note records from Firebase Firestore to SQLite database.
 * Uses the BaseMigrator framework for robust batch processing and error handling.
 *
 * Handles complex note features:
 * - Tags (JSON array)
 * - Public/private visibility
 * - Word count calculation
 * - Note types (GENERAL, POETRY, CHARACTER, etc.)
 *
 * Usage:
 *   npm run migrate:notes           # Normal migration
 *   npm run migrate:notes -- --dry-run  # Test without writing
 *   npm run migrate:notes -- --verbose  # Detailed logging
 *
 * @phase Phase 2 - SQLITE-006 - Notes Migration
 */

import { BaseMigrator, type MigrationOptions, type MigrationStats } from './base-migrator';
import { db } from '../../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { batchCreateNotes } from '../../src/lib/repositories/note-repository';

/**
 * Firestore Note document structure
 */
interface FirestoreNote {
  id: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  createdAt: any; // Firestore Timestamp
  lastModified?: any; // Firestore Timestamp
  tags?: string[];
  isPublic?: boolean;
  wordCount?: number;
  noteType?: string;
}

/**
 * SQLite Note structure (without id and createdAt - auto-generated)
 */
interface SQLiteNote {
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  tags?: string[];
  isPublic?: boolean;
  wordCount?: number;
  noteType?: string;
}

/**
 * Notes Migrator Class
 */
class NotesMigrator extends BaseMigrator {
  private notes: SQLiteNote[] = [];

  /**
   * Validate a note record before migration
   */
  protected validateRecord(record: FirestoreNote): boolean {
    if (!record.userId || typeof record.userId !== 'string') {
      this.log(`Invalid userId in note: ${record.id}`, 'warn');
      return false;
    }

    if (typeof record.chapterId !== 'number' || record.chapterId < 1) {
      this.log(`Invalid chapterId in note: ${record.id}`, 'warn');
      return false;
    }

    if (!record.selectedText || typeof record.selectedText !== 'string') {
      this.log(`Invalid selectedText in note: ${record.id}`, 'warn');
      return false;
    }

    if (!record.note || typeof record.note !== 'string') {
      this.log(`Invalid note content in note: ${record.id}`, 'warn');
      return false;
    }

    // Validate tags if present
    if (record.tags && !Array.isArray(record.tags)) {
      this.log(`Invalid tags format in note: ${record.id}`, 'warn');
      return false;
    }

    // Validate isPublic if present
    if (record.isPublic !== undefined && typeof record.isPublic !== 'boolean') {
      this.log(`Invalid isPublic value in note: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Fetch all notes from Firestore
   */
  private async fetchFirestoreNotes(): Promise<FirestoreNote[]> {
    this.log('📥 Fetching notes from Firestore...');

    const notesRef = collection(db, 'notes');
    const querySnapshot = await getDocs(notesRef);

    const notes: FirestoreNote[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({
        id: doc.id,
        userId: data.userId,
        chapterId: data.chapterId,
        selectedText: data.selectedText,
        note: data.note,
        createdAt: data.createdAt,
        lastModified: data.lastModified,
        tags: data.tags,
        isPublic: data.isPublic,
        wordCount: data.wordCount,
        noteType: data.noteType,
      } as FirestoreNote);
    });

    this.log(`✅ Fetched ${notes.length} notes from Firestore`);
    return notes;
  }

  /**
   * Transform Firestore note to SQLite format
   */
  private transformNote(firestoreNote: FirestoreNote): SQLiteNote {
    return {
      userId: firestoreNote.userId,
      chapterId: firestoreNote.chapterId,
      selectedText: firestoreNote.selectedText,
      note: firestoreNote.note,
      tags: firestoreNote.tags || [],
      isPublic: firestoreNote.isPublic || false,
      wordCount: firestoreNote.wordCount,
      noteType: firestoreNote.noteType,
    };
  }

  /**
   * Get current record count from SQLite
   */
  protected async getRecordCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
    return result.count;
  }

  /**
   * Get statistics about note features
   */
  private getFeatureStats(notes: FirestoreNote[]): {
    withTags: number;
    public: number;
    typed: number;
    avgWordCount: number;
  } {
    let withTags = 0;
    let publicNotes = 0;
    let typed = 0;
    let totalWords = 0;

    for (const note of notes) {
      if (note.tags && note.tags.length > 0) withTags++;
      if (note.isPublic) publicNotes++;
      if (note.noteType) typed++;
      if (note.wordCount) totalWords += note.wordCount;
    }

    return {
      withTags,
      public: publicNotes,
      typed,
      avgWordCount: notes.length > 0 ? Math.round(totalWords / notes.length) : 0,
    };
  }

  /**
   * Execute the migration
   */
  public async migrate(): Promise<MigrationStats> {
    this.log('\n' + '='.repeat(80));
    this.log('🚀 Starting Notes Migration: Firebase → SQLite');
    this.log('='.repeat(80));

    try {
      // Step 1: Fetch data from Firestore
      const firestoreNotes = await this.fetchFirestoreNotes();
      this.stats.totalRecords = firestoreNotes.length;

      if (firestoreNotes.length === 0) {
        this.log('⚠️  No notes found in Firestore. Nothing to migrate.', 'warn');
        return this.getStats();
      }

      // Show feature statistics
      const featureStats = this.getFeatureStats(firestoreNotes);
      this.log('\n📊 Note Feature Statistics:');
      this.log(`   Notes with tags:     ${featureStats.withTags} (${((featureStats.withTags / firestoreNotes.length) * 100).toFixed(1)}%)`);
      this.log(`   Public notes:        ${featureStats.public} (${((featureStats.public / firestoreNotes.length) * 100).toFixed(1)}%)`);
      this.log(`   Typed notes:         ${featureStats.typed} (${((featureStats.typed / firestoreNotes.length) * 100).toFixed(1)}%)`);
      this.log(`   Avg. word count:     ${featureStats.avgWordCount} words`);

      // Step 2: Validate and transform records
      this.log('\n🔍 Validating and transforming records...');
      const validNotes: SQLiteNote[] = [];

      for (const note of firestoreNotes) {
        if (this.options.validateData && !this.validateRecord(note)) {
          this.stats.skippedRecords++;
          continue;
        }

        validNotes.push(this.transformNote(note));
      }

      this.log(`✅ Validated ${validNotes.length} notes (skipped ${this.stats.skippedRecords})`);

      // Step 3: Dry run check
      if (this.options.dryRun) {
        this.log('\n🔍 DRY RUN MODE - No data will be written to SQLite', 'warn');
        this.log(`Would migrate ${validNotes.length} notes`);
        this.stats.successfulRecords = validNotes.length;
        return this.getStats();
      }

      // Step 4: Clear existing data (optional - can be controlled by flag)
      const existingCount = await this.getRecordCount();
      if (existingCount > 0) {
        this.log(`⚠️  Found ${existingCount} existing notes in SQLite`, 'warn');
        this.log('   Migration will add new records (duplicates may occur)');
      }

      // Step 5: Batch insert into SQLite
      this.log('\n📝 Inserting notes into SQLite...');
      await this.processBatch(validNotes, async (batch) => {
        batchCreateNotes(batch);
      });

      // Step 6: Verify migration
      const finalCount = await this.getRecordCount();
      this.log(`\n✅ Migration completed. SQLite now contains ${finalCount} notes`);

      // Step 7: Verify feature preservation
      this.log('\n🔍 Verifying feature preservation...');
      const publicCount = this.db.prepare('SELECT COUNT(*) as count FROM notes WHERE isPublic = 1').get() as { count: number };
      const taggedCount = this.db.prepare('SELECT COUNT(*) as count FROM notes WHERE tags != \'[]\'').get() as { count: number };
      const typedCount = this.db.prepare('SELECT COUNT(*) as count FROM notes WHERE noteType IS NOT NULL').get() as { count: number };

      this.log(`   Public notes in SQLite:  ${publicCount.count} (expected ~${featureStats.public})`);
      this.log(`   Tagged notes in SQLite:  ${taggedCount.count} (expected ~${featureStats.withTags})`);
      this.log(`   Typed notes in SQLite:   ${typedCount.count} (expected ~${featureStats.typed})`);

      // Step 8: Integrity check
      const expectedCount = existingCount + validNotes.length;
      await this.verifyIntegrity(expectedCount);

      return this.getStats();
    } catch (error: any) {
      this.log(`❌ Migration failed: ${error.message}`, 'error');
      console.error(error);
      throw error;
    } finally {
      this.printSummary();
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    batchSize: 500,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    validateData: !args.includes('--no-validate'),
  };

  const migrator = new NotesMigrator(options);

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { NotesMigrator };
