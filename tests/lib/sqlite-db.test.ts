/**
 * @fileOverview SQLite Database Initialization Tests
 *
 * Tests for SQLite database connection, initialization, and utility functions
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { toUnixTimestamp, fromUnixTimestamp } from '@/lib/sqlite-db';

describe('SQLite Database Initialization', () => {
  let testDbPath: string;
  let testDb: Database.Database;

  beforeEach(() => {
    // Create a test database in memory
    testDb = new Database(':memory:');
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });

  describe('Database Table Creation', () => {
    test('should create users table with correct schema', () => {
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          email TEXT,
          currentLevel INTEGER DEFAULT 1,
          currentXP INTEGER DEFAULT 0,
          totalXP INTEGER DEFAULT 0,
          attributes TEXT DEFAULT '{}',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      const tableInfo = testDb.prepare("PRAGMA table_info(users)").all();
      expect(tableInfo).toHaveLength(9);

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('currentLevel');
      expect(columnNames).toContain('currentXP');
      expect(columnNames).toContain('totalXP');
      expect(columnNames).toContain('attributes');
    });

    test('should create daily_tasks table with correct schema', () => {
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS daily_tasks (
          id TEXT PRIMARY KEY,
          taskType TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          baseXP INTEGER NOT NULL,
          content TEXT NOT NULL,
          sourceChapter INTEGER,
          sourceVerseStart INTEGER,
          sourceVerseEnd INTEGER,
          createdAt INTEGER NOT NULL
        )
      `);

      const tableInfo = testDb.prepare("PRAGMA table_info(daily_tasks)").all();
      expect(tableInfo).toHaveLength(11);

      const columnNames = tableInfo.map((col: any) => col.name);
      expect(columnNames).toContain('taskType');
      expect(columnNames).toContain('difficulty');
      expect(columnNames).toContain('baseXP');
      expect(columnNames).toContain('content');
    });

    test('should create daily_progress table with correct schema', () => {
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS daily_progress (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          date TEXT NOT NULL,
          tasks TEXT NOT NULL,
          completedTaskIds TEXT DEFAULT '[]',
          skippedTaskIds TEXT DEFAULT '[]',
          totalXPEarned INTEGER DEFAULT 0,
          totalAttributeGains TEXT DEFAULT '{}',
          usedSourceIds TEXT DEFAULT '[]',
          streak INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        )
      `);

      const tableInfo = testDb.prepare("PRAGMA table_info(daily_progress)").all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('userId');
      expect(columnNames).toContain('date');
      expect(columnNames).toContain('tasks');
      expect(columnNames).toContain('completedTaskIds');
      expect(columnNames).toContain('totalXPEarned');
    });

    test('should create task_submissions table with correct schema', () => {
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS task_submissions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          taskId TEXT NOT NULL,
          userAnswer TEXT NOT NULL,
          score INTEGER NOT NULL,
          feedback TEXT,
          xpEarned INTEGER DEFAULT 0,
          attributeGains TEXT,
          submittedAt INTEGER NOT NULL
        )
      `);

      const tableInfo = testDb.prepare("PRAGMA table_info(task_submissions)").all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('userAnswer');
      expect(columnNames).toContain('score');
      expect(columnNames).toContain('feedback');
      expect(columnNames).toContain('xpEarned');
    });
  });

  describe('Timestamp Conversion Functions', () => {
    test('toUnixTimestamp should convert Firebase-like Timestamp to milliseconds', () => {
      const firebaseTimestamp = {
        seconds: 1736937000, // 2025-01-15T10:30:00Z
        toMillis: () => 1736937000000
      };
      const timestamp = toUnixTimestamp(firebaseTimestamp);

      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBe(1736937000000);
    });

    test('toUnixTimestamp should handle seconds property', () => {
      const timestamp = toUnixTimestamp({ seconds: 1736937000 });

      expect(timestamp).toBe(1736937000000);
    });

    test('toUnixTimestamp should return Date.now() when no timestamp provided', () => {
      const before = Date.now();
      const timestamp = toUnixTimestamp();
      const after = Date.now();

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    test('fromUnixTimestamp should convert milliseconds to Firebase-like Timestamp', () => {
      const timestamp = 1736938200000; // 2025-01-15T10:30:00Z
      const result = fromUnixTimestamp(timestamp);

      expect(result.seconds).toBe(1736938200);
      expect(result.nanoseconds).toBe(0);
      expect(result.toMillis()).toBe(timestamp);
    });

    test('should handle round-trip conversion correctly', () => {
      const originalMillis = new Date('2025-10-27T12:00:00Z').getTime();
      const firebaseTimestamp = fromUnixTimestamp(originalMillis);
      const convertedMillis = toUnixTimestamp(firebaseTimestamp);

      expect(convertedMillis).toBe(originalMillis);
      expect(firebaseTimestamp.toMillis()).toBe(originalMillis);
    });

    test('should handle current timestamp round-trip', () => {
      const now = Date.now();
      const firebaseTimestamp = fromUnixTimestamp(now);
      const converted = toUnixTimestamp(firebaseTimestamp);

      expect(converted).toBe(now);
    });
  });

  describe('Database Operations', () => {
    test('should support JSON storage and retrieval', () => {
      testDb.exec(`
        CREATE TABLE test_json (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL
        )
      `);

      const testData = { attributes: { wisdom: 10, creativity: 5 }, tags: ['test', 'json'] };
      const stmt = testDb.prepare('INSERT INTO test_json (id, data) VALUES (?, ?)');
      stmt.run('test_1', JSON.stringify(testData));

      const result = testDb.prepare('SELECT data FROM test_json WHERE id = ?').get('test_1') as { data: string };
      const parsed = JSON.parse(result.data);

      expect(parsed).toEqual(testData);
      expect(parsed.attributes.wisdom).toBe(10);
      expect(parsed.tags).toHaveLength(2);
    });

    test('should handle transactions', () => {
      testDb.exec(`
        CREATE TABLE test_transaction (
          id TEXT PRIMARY KEY,
          value INTEGER
        )
      `);

      const insertMany = testDb.transaction((items: Array<{ id: string; value: number }>) => {
        const stmt = testDb.prepare('INSERT INTO test_transaction (id, value) VALUES (?, ?)');
        for (const item of items) {
          stmt.run(item.id, item.value);
        }
      });

      insertMany([
        { id: 'item_1', value: 100 },
        { id: 'item_2', value: 200 },
        { id: 'item_3', value: 300 }
      ]);

      const count = testDb.prepare('SELECT COUNT(*) as count FROM test_transaction').get() as { count: number };
      expect(count.count).toBe(3);
    });

    test('should support prepared statements', () => {
      testDb.exec(`
        CREATE TABLE test_prepared (
          id TEXT PRIMARY KEY,
          name TEXT
        )
      `);

      const stmt = testDb.prepare('INSERT INTO test_prepared (id, name) VALUES (?, ?)');
      stmt.run('user_1', 'Alice');
      stmt.run('user_2', 'Bob');

      const selectStmt = testDb.prepare('SELECT name FROM test_prepared WHERE id = ?');
      const result1 = selectStmt.get('user_1') as { name: string };
      const result2 = selectStmt.get('user_2') as { name: string };

      expect(result1.name).toBe('Alice');
      expect(result2.name).toBe('Bob');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty JSON arrays', () => {
      testDb.exec(`
        CREATE TABLE test_empty (
          id TEXT PRIMARY KEY,
          items TEXT
        )
      `);

      const stmt = testDb.prepare('INSERT INTO test_empty (id, items) VALUES (?, ?)');
      stmt.run('test_1', JSON.stringify([]));

      const result = testDb.prepare('SELECT items FROM test_empty WHERE id = ?').get('test_1') as { items: string };
      const parsed = JSON.parse(result.items);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    test('should handle empty JSON objects', () => {
      testDb.exec(`
        CREATE TABLE test_empty_obj (
          id TEXT PRIMARY KEY,
          data TEXT
        )
      `);

      const stmt = testDb.prepare('INSERT INTO test_empty_obj (id, data) VALUES (?, ?)');
      stmt.run('test_1', JSON.stringify({}));

      const result = testDb.prepare('SELECT data FROM test_empty_obj WHERE id = ?').get('test_1') as { data: string };
      const parsed = JSON.parse(result.data);

      expect(typeof parsed).toBe('object');
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    test('should handle null values correctly', () => {
      testDb.exec(`
        CREATE TABLE test_nulls (
          id TEXT PRIMARY KEY,
          optional_field TEXT
        )
      `);

      const stmt = testDb.prepare('INSERT INTO test_nulls (id, optional_field) VALUES (?, ?)');
      stmt.run('test_1', null);

      const result = testDb.prepare('SELECT optional_field FROM test_nulls WHERE id = ?').get('test_1') as { optional_field: string | null };

      expect(result.optional_field).toBeNull();
    });
  });
});
