#!/usr/bin/env tsx
/**
 * @fileOverview Base Migration Framework for Firebase to SQLite
 *
 * Provides reusable migration utilities, batch processing, validation,
 * and error handling for data migration operations.
 *
 * @phase Phase 1 - SQLITE-003 - Data Migration Framework
 */

import type Database from 'better-sqlite3';
import { getDatabase } from '../../src/lib/sqlite-db';

/**
 * Firebase Timestamp type
 */
export type FirestoreTimestamp =
  | { toMillis(): number }
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number; _nanoseconds?: number }
  | number
  | undefined;

/**
 * Migration options
 */
export interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  verbose?: boolean;
  validateData?: boolean;
}

/**
 * Migration statistics
 */
export interface MigrationStats {
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Base migrator class for Firebase to SQLite migrations
 */
export abstract class BaseMigrator {
  protected db: Database.Database;
  protected options: Required<MigrationOptions>;
  protected stats: MigrationStats;

  constructor(options: MigrationOptions = {}) {
    this.db = getDatabase();
    this.options = {
      batchSize: options.batchSize ?? 1000,
      dryRun: options.dryRun ?? false,
      verbose: options.verbose ?? false,
      validateData: options.validateData ?? true,
    };
    this.stats = {
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Normalize Firebase timestamp to Unix milliseconds
   */
  protected normalizeTimestamp(value: FirestoreTimestamp, fallback: number): number {
    if (value === undefined || value === null) {
      return fallback;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof (value as any).toMillis === 'function') {
      return (value as any).toMillis();
    }
    if (typeof (value as any).seconds === 'number') {
      return (value as any).seconds * 1000;
    }
    if (typeof (value as any)._seconds === 'number') {
      return (value as any)._seconds * 1000;
    }
    return fallback;
  }

  /**
   * Log message with timestamp
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️ ' : 'ℹ️ ';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  /**
   * Log verbose message (only if verbose mode enabled)
   */
  protected verbose(message: string): void {
    if (this.options.verbose) {
      this.log(message, 'info');
    }
  }

  /**
   * Process records in batches
   */
  protected async processBatch<T>(
    records: T[],
    processor: (batch: T[]) => Promise<void>
  ): Promise<void> {
    const { batchSize } = this.options;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);

      this.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

      try {
        await processor(batch);
        this.stats.successfulRecords += batch.length;
      } catch (error: any) {
        this.log(`Batch ${batchNum} failed: ${error.message}`, 'error');
        this.stats.failedRecords += batch.length;
        throw error;
      }
    }
  }

  /**
   * Validate record before migration
   */
  protected abstract validateRecord(record: any): boolean;

  /**
   * Execute migration
   */
  public abstract migrate(): Promise<MigrationStats>;

  /**
   * Get migration statistics
   */
  public getStats(): MigrationStats {
    return {
      ...this.stats,
      endTime: Date.now(),
      duration: Date.now() - this.stats.startTime,
    };
  }

  /**
   * Print migration summary
   */
  public printSummary(): void {
    const stats = this.getStats();
    const durationSec = (stats.duration! / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('Migration Summary');
    console.log('='.repeat(80));
    console.log(`Total Records:      ${stats.totalRecords}`);
    console.log(`Successful:         ${stats.successfulRecords} (${((stats.successfulRecords / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Failed:             ${stats.failedRecords}`);
    console.log(`Skipped:            ${stats.skippedRecords}`);
    console.log(`Duration:           ${durationSec}s`);
    console.log(`Records/sec:        ${(stats.successfulRecords / parseFloat(durationSec)).toFixed(1)}`);
    console.log(`Dry Run:            ${this.options.dryRun ? 'Yes' : 'No'}`);
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Verify data integrity after migration
   */
  public async verifyIntegrity(expectedCount: number): Promise<boolean> {
    const actualCount = await this.getRecordCount();

    this.log(`\n📊 Integrity Check:`);
    this.log(`Expected records: ${expectedCount}`);
    this.log(`Actual records:   ${actualCount}`);

    if (actualCount === expectedCount) {
      this.log(`✅ Integrity check passed`, 'info');
      return true;
    } else {
      this.log(`❌ Integrity check failed: count mismatch`, 'error');
      return false;
    }
  }

  /**
   * Get current record count from SQLite
   */
  protected abstract getRecordCount(): Promise<number>;
}

/**
 * Utility functions for migrations
 */
export const migrationUtils = {
  /**
   * Generate unique ID for migration
   */
  generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Sanitize string for SQL
   */
  sanitize(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).replace(/'/g, "''");
  },

  /**
   * Calculate checksum for data validation
   */
  checksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  },
};

export default BaseMigrator;
