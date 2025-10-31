/**
 * @fileOverview Comprehensive tests for User Repository
 *
 * Test Coverage:
 * - Basic CRUD operations
 * - XP Transaction management
 * - XP Lock mechanism
 * - Level-Up detection and recording
 * - Advanced queries
 * - Atomic operations with deduplication
 * - Concurrent operation handling
 * - Error scenarios
 *
 * @phase Phase 3 - Milestone 1
 */

import Database from 'better-sqlite3';
import * as userRepo from '../../src/lib/repositories/user-repository';

// Mock getDatabase to use in-memory database for tests
let testDb: Database.Database;

jest.mock('../../src/lib/sqlite-db', () => ({
  getDatabase: () => testDb,
}));

describe('User Repository - Comprehensive Test Suite', () => {
  beforeEach(() => {
    // Create fresh in-memory database for each test
    testDb = new Database(':memory:');

    // Initialize schema
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        currentLevel INTEGER DEFAULT 0,
        currentXP INTEGER DEFAULT 0,
        totalXP INTEGER DEFAULT 0,
        attributes TEXT DEFAULT '{}',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS xp_transactions (
        transactionId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT,
        source TEXT,
        sourceId TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, sourceId)
      );

      CREATE TABLE IF NOT EXISTS xp_transaction_locks (
        lockId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sourceId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(userId, sourceId)
      );

      CREATE TABLE IF NOT EXISTS level_ups (
        levelUpId TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        fromLevel INTEGER NOT NULL,
        toLevel INTEGER NOT NULL,
        unlockedContent TEXT,
        unlockedPermissions TEXT,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  });

  afterEach(() => {
    testDb.close();
  });

  // ============================================================
  // Basic CRUD Operations Tests
  // ============================================================

  describe('Basic CRUD Operations', () => {
    test('should create a new user with default values', () => {
      const user = userRepo.createUser('user1', 'TestUser', 'test@example.com');

      expect(user.userId).toBe('user1');
      expect(user.username).toBe('TestUser');
      expect(user.email).toBe('test@example.com');
      expect(user.currentLevel).toBe(0);
      expect(user.currentXP).toBe(0);
      expect(user.totalXP).toBe(0);
      expect(user.attributes).toEqual({
        poetrySkill: 0,
        culturalKnowledge: 0,
        analyticalThinking: 0,
        socialInfluence: 0,
        learningPersistence: 0,
      });
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should create user without email', () => {
      const user = userRepo.createUser('user2', 'NoEmailUser');

      expect(user.userId).toBe('user2');
      expect(user.email).toBeUndefined();
    });

    test('should get user by ID', () => {
      userRepo.createUser('user3', 'GetUser', 'get@example.com');
      const user = userRepo.getUserById('user3');

      expect(user).not.toBeNull();
      expect(user!.username).toBe('GetUser');
    });

    test('should return null for non-existent user', () => {
      const user = userRepo.getUserById('nonexistent');
      expect(user).toBeNull();
    });

    test('should update user profile', () => {
      userRepo.createUser('user4', 'UpdateUser');
      const updated = userRepo.updateUser('user4', {
        username: 'UpdatedName',
        currentLevel: 2,
        currentXP: 50,
      });

      expect(updated.username).toBe('UpdatedName');
      expect(updated.currentLevel).toBe(2);
      expect(updated.currentXP).toBe(50);
    });

    test('should update user attributes', () => {
      userRepo.createUser('user5', 'AttrUser');
      const updated = userRepo.updateAttributes('user5', {
        poetrySkill: 10,
        culturalKnowledge: 5,
      });

      expect(updated.attributes.poetrySkill).toBe(10);
      expect(updated.attributes.culturalKnowledge).toBe(5);
      expect(updated.attributes.analyticalThinking).toBe(0); // unchanged
    });

    test('should delete user', () => {
      userRepo.createUser('user6', 'DeleteUser');
      userRepo.deleteUser('user6');
      const user = userRepo.getUserById('user6');

      expect(user).toBeNull();
    });

    test('should check if user exists', () => {
      userRepo.createUser('user7', 'ExistUser');

      expect(userRepo.userExists('user7')).toBe(true);
      expect(userRepo.userExists('nonexistent')).toBe(false);
    });
  });

  // ============================================================
  // XP Transaction Tests
  // ============================================================

  describe('XP Transaction Management', () => {
    beforeEach(() => {
      userRepo.createUser('xpUser', 'XPTestUser');
    });

    test('should create XP transaction', () => {
      const txId = userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 10,
        reason: 'Test reward',
        source: 'test',
        sourceId: 'test-1',
      });

      expect(txId).toMatch(/^xp_xpUser_\d+_/);
    });

    test('should get XP transactions by user', () => {
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 10,
        reason: 'Reward 1',
        source: 'test',
        sourceId: 'test-1',
      });
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 20,
        reason: 'Reward 2',
        source: 'test',
        sourceId: 'test-2',
      });

      const transactions = userRepo.getXPTransactionsByUser('xpUser');
      expect(transactions.length).toBe(2);
      expect(transactions[0].amount).toBe(20); // Most recent first
      expect(transactions[1].amount).toBe(10);
    });

    test('should limit XP transactions query', () => {
      for (let i = 0; i < 10; i++) {
        userRepo.createXPTransaction({
          userId: 'xpUser',
          amount: i,
          reason: `Reward ${i}`,
          source: 'test',
          sourceId: `test-${i}`,
        });
      }

      const transactions = userRepo.getXPTransactionsByUser('xpUser', 5);
      expect(transactions.length).toBe(5);
    });

    test('should get XP transactions by source', () => {
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 10,
        reason: 'Chapter 1',
        source: 'reading',
        sourceId: 'chapter-1',
      });
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 15,
        reason: 'Task 1',
        source: 'task',
        sourceId: 'task-1',
      });

      const readingTxs = userRepo.getXPTransactionsBySource('reading', 'chapter-1');
      expect(readingTxs.length).toBe(1);
      expect(readingTxs[0].amount).toBe(10);
    });

    test('should check if XP transaction exists', () => {
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 10,
        reason: 'Test',
        source: 'test',
        sourceId: 'dedup-test',
      });

      expect(userRepo.hasXPTransaction('xpUser', 'dedup-test')).toBe(true);
      expect(userRepo.hasXPTransaction('xpUser', 'nonexistent')).toBe(false);
    });

    test('should calculate total XP from transactions', () => {
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 10,
        reason: 'Reward 1',
        source: 'test',
        sourceId: 'test-1',
      });
      userRepo.createXPTransaction({
        userId: 'xpUser',
        amount: 25,
        reason: 'Reward 2',
        source: 'test',
        sourceId: 'test-2',
      });

      const total = userRepo.getTotalXPFromTransactions('xpUser');
      expect(total).toBe(35);
    });

    test('should return 0 for user with no transactions', () => {
      const total = userRepo.getTotalXPFromTransactions('xpUser');
      expect(total).toBe(0);
    });
  });

  // ============================================================
  // XP Lock Tests
  // ============================================================

  describe('XP Lock Mechanism', () => {
    beforeEach(() => {
      userRepo.createUser('lockUser', 'LockTestUser');
    });

    test('should create XP lock', () => {
      const lockId = userRepo.createXPLock('lockUser', 'chapter-1');
      expect(lockId).toBe('lock_lockUser_chapter-1');
    });

    test('should check if XP lock exists', () => {
      userRepo.createXPLock('lockUser', 'chapter-1');

      expect(userRepo.hasXPLock('lockUser', 'chapter-1')).toBe(true);
      expect(userRepo.hasXPLock('lockUser', 'chapter-2')).toBe(false);
    });

    test('should handle duplicate lock creation gracefully', () => {
      userRepo.createXPLock('lockUser', 'chapter-1');
      // Second attempt should not throw error
      const lockId = userRepo.createXPLock('lockUser', 'chapter-1');
      expect(lockId).toBe('lock_lockUser_chapter-1');
    });

    test('should delete XP lock', () => {
      userRepo.createXPLock('lockUser', 'chapter-1');
      userRepo.deleteXPLock('lockUser', 'chapter-1');

      expect(userRepo.hasXPLock('lockUser', 'chapter-1')).toBe(false);
    });

    test('should cleanup expired locks', () => {
      // Create old lock (simulate expired)
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      testDb.prepare(`
        INSERT INTO xp_transaction_locks (lockId, userId, sourceId, createdAt)
        VALUES (?, ?, ?, ?)
      `).run('old_lock', 'lockUser', 'old-source', oldTimestamp);

      // Create fresh lock
      userRepo.createXPLock('lockUser', 'new-source');

      const deleted = userRepo.cleanupExpiredLocks(24 * 60 * 60 * 1000); // 24 hours
      expect(deleted).toBe(1);
      expect(userRepo.hasXPLock('lockUser', 'old-source')).toBe(false);
      expect(userRepo.hasXPLock('lockUser', 'new-source')).toBe(true);
    });

    test('should not cleanup fresh locks', () => {
      userRepo.createXPLock('lockUser', 'fresh-source');

      const deleted = userRepo.cleanupExpiredLocks(24 * 60 * 60 * 1000);
      expect(deleted).toBe(0);
      expect(userRepo.hasXPLock('lockUser', 'fresh-source')).toBe(true);
    });
  });

  // ============================================================
  // Level-Up Recording Tests
  // ============================================================

  describe('Level-Up Recording', () => {
    beforeEach(() => {
      userRepo.createUser('levelUser', 'LevelTestUser');
    });

    test('should create level-up record', () => {
      const levelUpId = userRepo.createLevelUpRecord({
        userId: 'levelUser',
        fromLevel: 0,
        toLevel: 1,
        unlockedContent: ['每日任務系統', '成就收集系統'],
        unlockedPermissions: ['daily_tasks', 'basic_achievements'],
      });

      expect(levelUpId).toMatch(/^levelup_levelUser_\d+$/);
    });

    test('should get level-ups by user', () => {
      userRepo.createLevelUpRecord({
        userId: 'levelUser',
        fromLevel: 0,
        toLevel: 1,
      });
      userRepo.createLevelUpRecord({
        userId: 'levelUser',
        fromLevel: 1,
        toLevel: 2,
      });

      const levelUps = userRepo.getLevelUpsByUser('levelUser');
      expect(levelUps.length).toBe(2);
      expect(levelUps[0].toLevel).toBe(2); // Most recent first
      expect(levelUps[1].toLevel).toBe(1);
    });

    test('should get latest level-up', () => {
      userRepo.createLevelUpRecord({
        userId: 'levelUser',
        fromLevel: 0,
        toLevel: 1,
      });
      userRepo.createLevelUpRecord({
        userId: 'levelUser',
        fromLevel: 1,
        toLevel: 2,
      });

      const latest = userRepo.getLatestLevelUp('levelUser');
      expect(latest).not.toBeNull();
      expect(latest!.toLevel).toBe(2);
    });

    test('should return null for user with no level-ups', () => {
      const latest = userRepo.getLatestLevelUp('levelUser');
      expect(latest).toBeNull();
    });
  });

  // ============================================================
  // Advanced Query Tests
  // ============================================================

  describe('Advanced Queries', () => {
    beforeEach(() => {
      userRepo.createUser('user1', 'Alice', 'alice@example.com');
      userRepo.updateUser('user1', { currentLevel: 5, totalXP: 450 });

      userRepo.createUser('user2', 'Bob', 'bob@example.com');
      userRepo.updateUser('user2', { currentLevel: 3, totalXP: 270 });

      userRepo.createUser('user3', 'Charlie', 'charlie@example.com');
      userRepo.updateUser('user3', { currentLevel: 5, totalXP: 500 });

      userRepo.createUser('user4', 'David', 'david@example.com');
      userRepo.updateUser('user4', { currentLevel: 2, totalXP: 180 });
    });

    test('should get user by email', () => {
      const user = userRepo.getUserByEmail('alice@example.com');
      expect(user).not.toBeNull();
      expect(user!.username).toBe('Alice');
    });

    test('should return null for non-existent email', () => {
      const user = userRepo.getUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    test('should get users by level range', () => {
      const users = userRepo.getUsersByLevel(3, 5);
      expect(users.length).toBe(3); // Bob, Alice, Charlie
      expect(users[0].username).toBe('Charlie'); // Highest XP first
      expect(users[1].username).toBe('Alice');
      expect(users[2].username).toBe('Bob');
    });

    test('should get users by minimum level', () => {
      const users = userRepo.getUsersByLevel(5);
      expect(users.length).toBe(2); // Alice, Charlie
    });

    test('should get top users by XP', () => {
      const topUsers = userRepo.getTopUsersByXP(2);
      expect(topUsers.length).toBe(2);
      expect(topUsers[0].username).toBe('Charlie'); // 500 XP
      expect(topUsers[1].username).toBe('Alice');   // 450 XP
    });

    test('should search users by username', () => {
      const results = userRepo.searchUsers('Ali'); // Should match only "Alice"
      expect(results.length).toBe(1);
      expect(results[0].username).toBe('Alice');
    });

    test('should search users case-insensitively', () => {
      const results = userRepo.searchUsers('CHAR'); // Should match "Charlie"
      expect(results.length).toBe(1);
      expect(results[0].username).toBe('Charlie');
    });

    test('should limit search results', () => {
      userRepo.createUser('user5', 'Test1');
      userRepo.createUser('user6', 'Test2');
      userRepo.createUser('user7', 'Test3');

      const results = userRepo.searchUsers('Test', 2);
      expect(results.length).toBe(2);
    });
  });

  // ============================================================
  // Atomic XP Award Tests
  // ============================================================

  describe('Atomic XP Award with Deduplication', () => {
    beforeEach(() => {
      userRepo.createUser('awardUser', 'AwardTestUser');
    });

    test('should award XP atomically', () => {
      const result = userRepo.awardXPWithTransaction(
        'awardUser',
        50,
        'Test reward',
        'test',
        'test-source-1'
      );

      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(false);
      expect(result.newTotalXP).toBe(50);
      expect(result.newCurrentXP).toBe(50);
      expect(result.transactionId).toBeDefined();
    });

    test('should prevent duplicate XP awards', () => {
      // First award
      const result1 = userRepo.awardXPWithTransaction(
        'awardUser',
        50,
        'Test reward',
        'test',
        'dedup-source'
      );
      expect(result1.isDuplicate).toBe(false);

      // Second award with same sourceId
      const result2 = userRepo.awardXPWithTransaction(
        'awardUser',
        50,
        'Test reward',
        'test',
        'dedup-source'
      );
      expect(result2.isDuplicate).toBe(true);
      expect(result2.newTotalXP).toBe(50); // No change
    });

    test('should create lock during XP award', () => {
      userRepo.awardXPWithTransaction(
        'awardUser',
        50,
        'Test reward',
        'test',
        'lock-test'
      );

      expect(userRepo.hasXPLock('awardUser', 'lock-test')).toBe(true);
    });

    test('should create transaction record during XP award', () => {
      userRepo.awardXPWithTransaction(
        'awardUser',
        50,
        'Test reward',
        'test',
        'tx-test'
      );

      expect(userRepo.hasXPTransaction('awardUser', 'tx-test')).toBe(true);
    });

    test('should validate userId', () => {
      expect(() => {
        userRepo.awardXPWithTransaction('', 50, 'Test', 'test', 'source');
      }).toThrow('userId and sourceId are required');
    });

    test('should validate sourceId', () => {
      expect(() => {
        userRepo.awardXPWithTransaction('awardUser', 50, 'Test', 'test', '');
      }).toThrow('userId and sourceId are required');
    });

    test('should validate amount is positive', () => {
      expect(() => {
        userRepo.awardXPWithTransaction('awardUser', 0, 'Test', 'test', 'source');
      }).toThrow('amount must be a positive number');
    });

    test('should validate amount is a number', () => {
      expect(() => {
        userRepo.awardXPWithTransaction('awardUser', NaN, 'Test', 'test', 'source');
      }).toThrow('amount must be a positive number');
    });

    test('should throw error for non-existent user', () => {
      expect(() => {
        userRepo.awardXPWithTransaction('nonexistent', 50, 'Test', 'test', 'source');
      }).toThrow('User not found');
    });
  });

  // ============================================================
  // Level-Up Detection Tests
  // ============================================================

  describe('Level-Up Detection', () => {
    test('should detect level-up from 0 to 1', () => {
      const result = userRepo.detectLevelUp(0, 90);
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(0);
      expect(result.toLevel).toBe(1);
    });

    test('should detect level-up from 1 to 2', () => {
      const result = userRepo.detectLevelUp(90, 180);
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(1);
      expect(result.toLevel).toBe(2);
    });

    test('should not detect level-up within same level', () => {
      const result = userRepo.detectLevelUp(50, 80);
      expect(result.leveledUp).toBe(false);
      expect(result.fromLevel).toBe(0);
      expect(result.toLevel).toBe(0);
    });

    test('should detect multiple level jumps', () => {
      const result = userRepo.detectLevelUp(0, 270);
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(0);
      expect(result.toLevel).toBe(3);
    });

    test('should calculate unlocked content for level 1', () => {
      const content = userRepo.calculateUnlockedContent(1);
      expect(content).toContain('入門指南');
      expect(content).toContain('每日任務系統');
    });

    test('should calculate cumulative content for level 3', () => {
      const content = userRepo.calculateUnlockedContent(3);
      expect(content.length).toBeGreaterThan(5); // Cumulative
      expect(content).toContain('入門指南'); // Level 0
      expect(content).toContain('每日任務系統'); // Level 1
      expect(content).toContain('詩詞鑑賞'); // Level 2
      expect(content).toContain('詩詞會參與'); // Level 3
    });

    test('should calculate unlocked permissions for level 2', () => {
      const permissions = userRepo.calculateUnlockedPermissions(2);
      expect(permissions).toContain('basic_reading');
      expect(permissions).toContain('daily_tasks');
      expect(permissions).toContain('poetry_listening');
    });

    test('should handle max level correctly', () => {
      const content = userRepo.calculateUnlockedContent(7);
      expect(content).toContain('宗師典藏');
    });
  });

  // ============================================================
  // Complete XP Award with Level-Up Tests
  // ============================================================

  describe('Complete XP Award with Level-Up', () => {
    beforeEach(() => {
      userRepo.createUser('levelUpUser', 'LevelUpTestUser');
    });

    test('should award XP and detect level-up', () => {
      const result = userRepo.awardXPWithLevelUp(
        'levelUpUser',
        90,
        'Completed Chapter 1',
        'reading',
        'chapter-1'
      );

      expect(result.success).toBe(true);
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(0);
      expect(result.newLevel).toBe(1);
      expect(result.newTotalXP).toBe(90);
      expect(result.unlockedContent).toBeDefined();
      expect(result.unlockedPermissions).toBeDefined();
      expect(result.levelUpId).toBeDefined();
    });

    test('should update currentXP within level after level-up', () => {
      const result = userRepo.awardXPWithLevelUp(
        'levelUpUser',
        100, // 90 for level 1, 10 into level 1
        'Bonus reward',
        'test',
        'bonus-1'
      );

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(1);
      expect(result.newCurrentXP).toBe(10); // 10 XP into level 1
    });

    test('should not level-up with insufficient XP', () => {
      const result = userRepo.awardXPWithLevelUp(
        'levelUpUser',
        50,
        'Partial reward',
        'test',
        'partial-1'
      );

      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBe(0);
      expect(result.newTotalXP).toBe(50);
      expect(result.levelUpId).toBeUndefined();
    });

    test('should create level-up record on level-up', () => {
      userRepo.awardXPWithLevelUp(
        'levelUpUser',
        90,
        'Level up!',
        'test',
        'levelup-1'
      );

      const levelUps = userRepo.getLevelUpsByUser('levelUpUser');
      expect(levelUps.length).toBe(1);
      expect(levelUps[0].fromLevel).toBe(0);
      expect(levelUps[0].toLevel).toBe(1);
    });

    test('should handle multiple level-ups in sequence', () => {
      // Level 0 -> 1
      userRepo.awardXPWithLevelUp('levelUpUser', 90, 'Reward 1', 'test', 'source-1');

      // Level 1 -> 2
      userRepo.awardXPWithLevelUp('levelUpUser', 90, 'Reward 2', 'test', 'source-2');

      const user = userRepo.getUserById('levelUpUser');
      expect(user!.currentLevel).toBe(2);
      expect(user!.totalXP).toBe(180);

      const levelUps = userRepo.getLevelUpsByUser('levelUpUser');
      expect(levelUps.length).toBe(2);
    });

    test('should prevent duplicate XP award with level-up', () => {
      const result1 = userRepo.awardXPWithLevelUp(
        'levelUpUser',
        90,
        'First award',
        'test',
        'dedup-levelup'
      );
      expect(result1.leveledUp).toBe(true);

      const result2 = userRepo.awardXPWithLevelUp(
        'levelUpUser',
        90,
        'Duplicate attempt',
        'test',
        'dedup-levelup'
      );
      expect(result2.isDuplicate).toBe(true);
      expect(result2.leveledUp).toBe(false);
    });
  });

  // ============================================================
  // Concurrent Operations Tests
  // ============================================================

  describe('Concurrent Operations', () => {
    beforeEach(() => {
      userRepo.createUser('concUser', 'ConcurrentTestUser');
    });

    test('should handle concurrent XP awards with same sourceId (double-check lock)', () => {
      // Simulate race condition - both check lock before transaction
      const sourceId = 'concurrent-source';

      // First call succeeds
      const result1 = userRepo.awardXPWithTransaction(
        'concUser',
        50,
        'Concurrent 1',
        'test',
        sourceId
      );
      expect(result1.isDuplicate).toBe(false);

      // Second call is blocked by lock
      const result2 = userRepo.awardXPWithTransaction(
        'concUser',
        50,
        'Concurrent 2',
        'test',
        sourceId
      );
      expect(result2.isDuplicate).toBe(true);

      // Verify only one XP award
      const user = userRepo.getUserById('concUser');
      expect(user!.totalXP).toBe(50);
    });

    test('should handle multiple concurrent awards with different sourceIds', () => {
      userRepo.awardXPWithTransaction('concUser', 10, 'Award 1', 'test', 'source-1');
      userRepo.awardXPWithTransaction('concUser', 20, 'Award 2', 'test', 'source-2');
      userRepo.awardXPWithTransaction('concUser', 30, 'Award 3', 'test', 'source-3');

      const user = userRepo.getUserById('concUser');
      expect(user!.totalXP).toBe(60);

      const transactions = userRepo.getXPTransactionsByUser('concUser');
      expect(transactions.length).toBe(3);
    });
  });

  // ============================================================
  // Error Handling Tests
  // ============================================================

  describe('Error Handling', () => {
    test('should handle update of non-existent user gracefully', () => {
      expect(() => {
        userRepo.updateUser('nonexistent', { username: 'Test' });
      }).toThrow('Failed to retrieve updated user');
    });

    test('should handle attribute update of non-existent user', () => {
      expect(() => {
        userRepo.updateAttributes('nonexistent', { poetrySkill: 10 });
      }).toThrow('User not found');
    });

    test('should handle JSON parse errors in attributes', () => {
      // Manually insert corrupted data
      testDb.prepare(`
        INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('corrupt', 'CorruptUser', null, 1, 0, 0, 'invalid-json', Date.now(), Date.now());

      const user = userRepo.getUserById('corrupt');
      // Should fallback to default attributes
      expect(user!.attributes).toEqual({
        poetrySkill: 0,
        culturalKnowledge: 0,
        analyticalThinking: 0,
        socialInfluence: 0,
        learningPersistence: 0,
      });
    });
  });

  // ============================================================
  // Integration Tests
  // ============================================================

  describe('Integration Tests', () => {
    test('complete user journey: create -> award XP -> level up -> query', () => {
      // 1. Create user
      const user = userRepo.createUser('journey', 'JourneyUser', 'journey@test.com');
      expect(user.currentLevel).toBe(0);

      // 2. Award small XP (no level-up)
      const award1 = userRepo.awardXPWithLevelUp('journey', 50, 'Progress', 'test', 'progress-1');
      expect(award1.leveledUp).toBe(false);

      // 3. Award enough XP to level up
      const award2 = userRepo.awardXPWithLevelUp('journey', 50, 'Level up!', 'test', 'progress-2');
      expect(award2.leveledUp).toBe(true);
      expect(award2.newLevel).toBe(1);

      // 4. Continue to level 2
      const award3 = userRepo.awardXPWithLevelUp('journey', 90, 'Next level', 'test', 'progress-3');
      expect(award3.newLevel).toBe(2);

      // 5. Query user
      const finalUser = userRepo.getUserById('journey');
      expect(finalUser!.currentLevel).toBe(2);
      expect(finalUser!.totalXP).toBe(190);

      // 6. Check level-up history
      const levelUps = userRepo.getLevelUpsByUser('journey');
      expect(levelUps.length).toBe(2);

      // 7. Check XP transaction history
      const transactions = userRepo.getXPTransactionsByUser('journey');
      expect(transactions.length).toBe(3);

      // 8. Verify leaderboard ranking
      userRepo.createUser('other1', 'Other1');
      userRepo.awardXPWithLevelUp('other1', 100, 'Test', 'test', 'other-1');

      const topUsers = userRepo.getTopUsersByXP(5);
      expect(topUsers[0].userId).toBe('journey'); // Highest XP
    });

    test('cross-system deduplication: reading + daily tasks', () => {
      userRepo.createUser('dedup', 'DedupUser');

      // Award from reading system
      const reading = userRepo.awardXPWithLevelUp(
        'dedup',
        10,
        'Read Chapter 1',
        'reading',
        'chapter-1'
      );
      expect(reading.isDuplicate).toBe(false);

      // Try to award again from daily task system (same sourceId)
      const task = userRepo.awardXPWithLevelUp(
        'dedup',
        10,
        'Task: Read Chapter 1',
        'task',
        'chapter-1'  // Same sourceId!
      );
      expect(task.isDuplicate).toBe(true);

      // Verify total XP
      const user = userRepo.getUserById('dedup');
      expect(user!.totalXP).toBe(10); // Only awarded once
    });
  });
});
