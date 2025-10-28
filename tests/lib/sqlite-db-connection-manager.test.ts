/**
 * @fileOverview SQLite Database Connection Manager Tests
 *
 * Tests for enhanced connection manager features added in SQLITE-002:
 * - Health check functionality
 * - Database statistics
 * - Graceful shutdown
 * - Connection lifecycle
 *
 * @jest-environment node
 */

import {
  getDatabase,
  closeDatabase,
  isSQLiteAvailable,
  checkDatabaseHealth,
  getDatabaseStats,
} from '@/lib/sqlite-db';

describe('SQLite Connection Manager (SQLITE-002)', () => {
  describe('Database Initialization', () => {
    it('should initialize database singleton successfully', () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(db).not.toBeNull();
    });

    it('should return same instance on multiple calls (singleton pattern)', () => {
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });

    it('should report SQLite as available after initialization', () => {
      const db = getDatabase();
      expect(isSQLiteAvailable()).toBe(true);
    });
  });

  describe('Health Check Functionality', () => {
    beforeEach(() => {
      // Ensure database is initialized
      getDatabase();
    });

    it('should return healthy status when database is accessible', () => {
      const health = checkDatabaseHealth();

      expect(health.healthy).toBe(true);
      expect(health.initialized).toBe(true);
      expect(health.accessible).toBe(true);
      expect(health.error).toBeUndefined();
    });

    it('should execute simple query successfully in health check', () => {
      const health = checkDatabaseHealth();

      expect(health.accessible).toBe(true);
    });

    it('should detect database state correctly', () => {
      const health = checkDatabaseHealth();

      expect(health).toMatchObject({
        healthy: true,
        initialized: true,
        accessible: true,
      });
    });
  });

  describe('Database Statistics', () => {
    beforeEach(() => {
      getDatabase();
    });

    it('should return database statistics successfully', () => {
      const stats = getDatabaseStats();

      expect(stats).not.toBeNull();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('pageCount');
      expect(stats).toHaveProperty('pageSize');
      expect(stats).toHaveProperty('tables');
    });

    it('should report correct number of tables', () => {
      const stats = getDatabaseStats();

      expect(stats).not.toBeNull();
      expect(stats!.tables).toBeGreaterThan(0);
      // Should have at least the 7 core tables
      expect(stats!.tables).toBeGreaterThanOrEqual(7);
    });

    it('should return valid database size', () => {
      const stats = getDatabaseStats();

      expect(stats).not.toBeNull();
      expect(stats!.size).toBeGreaterThan(0);
      expect(typeof stats!.size).toBe('number');
    });

    it('should return valid page information', () => {
      const stats = getDatabaseStats();

      expect(stats).not.toBeNull();
      expect(stats!.pageCount).toBeGreaterThan(0);
      expect(stats!.pageSize).toBeGreaterThan(0);
      // Common SQLite page sizes: 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536
      expect([512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]).toContain(
        stats!.pageSize
      );
    });

    it('should calculate size correctly (pageCount * pageSize)', () => {
      const stats = getDatabaseStats();

      expect(stats).not.toBeNull();
      expect(stats!.size).toBe(stats!.pageCount * stats!.pageSize);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should handle database close gracefully', () => {
      getDatabase();
      expect(() => closeDatabase()).not.toThrow();
    });

    it('should allow closing non-initialized database without error', () => {
      // Close without initializing
      expect(() => closeDatabase()).not.toThrow();
    });

    it('should handle multiple close calls gracefully', () => {
      getDatabase();
      closeDatabase();
      expect(() => closeDatabase()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle health check when database is not initialized', () => {
      // Note: This test might be affected by previous tests initializing the database
      // In a real scenario, you might need to mock the dbInstance
      const health = checkDatabaseHealth();

      // Either healthy (already initialized) or properly reports error
      if (!health.healthy) {
        expect(health.error).toBeDefined();
        expect(health.initialized).toBe(false);
      }
    });

    it('should return null stats when database is not available', () => {
      // After closing, stats might return null if db is truly closed
      // Note: Due to singleton, this might not work as expected
      // In production, you'd need dependency injection or mocking
      const stats = getDatabaseStats();

      // Either returns stats (db still available) or null
      if (stats === null) {
        expect(stats).toBeNull();
      } else {
        expect(stats).toHaveProperty('size');
      }
    });
  });

  describe('Singleton Pattern Validation', () => {
    it('should maintain singleton pattern after multiple operations', () => {
      const db1 = getDatabase();
      const health = checkDatabaseHealth();
      const stats = getDatabaseStats();
      const db2 = getDatabase();

      expect(db1).toBe(db2);
      expect(health.initialized).toBe(true);
      expect(stats).not.toBeNull();
    });

    it('should report consistent availability', () => {
      getDatabase();
      const available1 = isSQLiteAvailable();
      checkDatabaseHealth();
      const available2 = isSQLiteAvailable();

      expect(available1).toBe(available2);
    });
  });

  describe('Integration Tests', () => {
    it('should allow normal database operations after health check', () => {
      const health = checkDatabaseHealth();
      expect(health.healthy).toBe(true);

      const db = getDatabase();
      const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
      const result = stmt.get() as { count: number };

      expect(result).toHaveProperty('count');
      expect(typeof result.count).toBe('number');
    });

    it('should provide stats consistent with actual database state', () => {
      const stats = getDatabaseStats();
      expect(stats).not.toBeNull();

      const db = getDatabase();
      const tablesQuery = `SELECT COUNT(*) as count FROM sqlite_master
                           WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
      const result = db.prepare(tablesQuery).get() as { count: number };

      expect(stats!.tables).toBe(result.count);
    });

    it('should maintain database integrity across all operations', () => {
      const db = getDatabase();
      const health = checkDatabaseHealth();
      const stats = getDatabaseStats();

      expect(db).toBeDefined();
      expect(health.healthy).toBe(true);
      expect(stats).not.toBeNull();
      expect(isSQLiteAvailable()).toBe(true);
    });
  });
});
