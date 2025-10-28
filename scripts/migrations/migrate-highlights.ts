#!/usr/bin/env tsx
/**
 * @fileOverview Highlights Migration Script - Firebase to SQLite
 *
 * Migrates all highlight records from Firebase Firestore to SQLite database.
 * Uses the BaseMigrator framework for robust batch processing and error handling.
 *
 * Usage:
 *   npm run migrate:highlights           # Normal migration
 *   npm run migrate:highlights -- --dry-run  # Test without writing
 *   npm run migrate:highlights -- --verbose  # Detailed logging
 *
 * @phase Phase 2 - SQLITE-005 - Highlights Migration
 */

import { BaseMigrator, type MigrationOptions, type MigrationStats } from './base-migrator';
import { db } from '../../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { batchCreateHighlights } from '../../src/lib/repositories/highlight-repository';

/**
 * Firestore Highlight document structure
 */
interface FirestoreHighlight {
  id: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  createdAt: any; // Firestore Timestamp
}

/**
 * SQLite Highlight structure
 */
interface SQLiteHighlight {
  userId: string;
  chapterId: number;
  selectedText: string;
}

/**
 * Highlights Migrator Class
 */
class HighlightsMigrator extends BaseMigrator {
  private highlights: SQLiteHighlight[] = [];

  /**
   * Validate a highlight record before migration
   */
  protected validateRecord(record: FirestoreHighlight): boolean {
    if (!record.userId || typeof record.userId !== 'string') {
      this.log(`Invalid userId in highlight: ${record.id}`, 'warn');
      return false;
    }

    if (typeof record.chapterId !== 'number' || record.chapterId < 1) {
      this.log(`Invalid chapterId in highlight: ${record.id}`, 'warn');
      return false;
    }

    if (!record.selectedText || typeof record.selectedText !== 'string') {
      this.log(`Invalid selectedText in highlight: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Fetch all highlights from Firestore
   */
  private async fetchFirestoreHighlights(): Promise<FirestoreHighlight[]> {
    this.log('📥 Fetching highlights from Firestore...');

    const highlightsRef = collection(db, 'highlights');
    const querySnapshot = await getDocs(highlightsRef);

    const highlights: FirestoreHighlight[] = [];

    querySnapshot.forEach((doc) => {
      highlights.push({
        id: doc.id,
        ...doc.data(),
      } as FirestoreHighlight);
    });

    this.log(`✅ Fetched ${highlights.length} highlights from Firestore`);
    return highlights;
  }

  /**
   * Transform Firestore highlight to SQLite format
   */
  private transformHighlight(firestoreHighlight: FirestoreHighlight): SQLiteHighlight {
    return {
      userId: firestoreHighlight.userId,
      chapterId: firestoreHighlight.chapterId,
      selectedText: firestoreHighlight.selectedText,
    };
  }

  /**
   * Get current record count from SQLite
   */
  protected async getRecordCount(): Promise<number> {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM highlights').get() as { count: number };
    return result.count;
  }

  /**
   * Execute the migration
   */
  public async migrate(): Promise<MigrationStats> {
    this.log('\n' + '='.repeat(80));
    this.log('🚀 Starting Highlights Migration: Firebase → SQLite');
    this.log('='.repeat(80));

    try {
      // Step 1: Fetch data from Firestore
      const firestoreHighlights = await this.fetchFirestoreHighlights();
      this.stats.totalRecords = firestoreHighlights.length;

      if (firestoreHighlights.length === 0) {
        this.log('⚠️  No highlights found in Firestore. Nothing to migrate.', 'warn');
        return this.getStats();
      }

      // Step 2: Validate and transform records
      this.log('🔍 Validating and transforming records...');
      const validHighlights: SQLiteHighlight[] = [];

      for (const highlight of firestoreHighlights) {
        if (this.options.validateData && !this.validateRecord(highlight)) {
          this.stats.skippedRecords++;
          continue;
        }

        validHighlights.push(this.transformHighlight(highlight));
      }

      this.log(`✅ Validated ${validHighlights.length} highlights (skipped ${this.stats.skippedRecords})`);

      // Step 3: Dry run check
      if (this.options.dryRun) {
        this.log('\n🔍 DRY RUN MODE - No data will be written to SQLite', 'warn');
        this.log(`Would migrate ${validHighlights.length} highlights`);
        this.stats.successfulRecords = validHighlights.length;
        return this.getStats();
      }

      // Step 4: Clear existing data (optional - can be controlled by flag)
      const existingCount = await this.getRecordCount();
      if (existingCount > 0) {
        this.log(`⚠️  Found ${existingCount} existing highlights in SQLite`, 'warn');
        this.log('   Migration will add new records (duplicates may occur)');
      }

      // Step 5: Batch insert into SQLite
      this.log('\n📝 Inserting highlights into SQLite...');
      await this.processBatch(validHighlights, async (batch) => {
        batchCreateHighlights(batch);
      });

      // Step 6: Verify migration
      const finalCount = await this.getRecordCount();
      this.log(`\n✅ Migration completed. SQLite now contains ${finalCount} highlights`);

      // Step 7: Integrity check
      const expectedCount = existingCount + validHighlights.length;
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

  const migrator = new HighlightsMigrator(options);

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

export { HighlightsMigrator };
