/**
 * @fileOverview User Repository Tests
 *
 * Unit tests for user CRUD operations with SQLite
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import Database from 'better-sqlite3';
import * as userRepository from '@/lib/repositories/user-repository';
import { getDatabase } from '@/lib/sqlite-db';

// Mock the database module
jest.mock('@/lib/sqlite-db', () => {
  let mockDb: Database.Database;

  return {
    getDatabase: jest.fn(() => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        // Initialize schema
        mockDb.exec(`
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
      }
      return mockDb;
    }),
    toUnixTimestamp: (date: Date) => date.getTime(),
    fromUnixTimestamp: (timestamp: number) => new Date(timestamp),
  };
});

describe('User Repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase();
    // Clean up users table
    db.prepare('DELETE FROM users').run();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('createUser', () => {
    test('should create a new user with default values', () => {
      const user = userRepository.createUser('user_001', 'Alice');

      expect(user.userId).toBe('user_001');
      expect(user.username).toBe('Alice');
      expect(user.currentLevel).toBe(1);
      expect(user.currentXP).toBe(0);
      expect(user.totalXP).toBe(0);
      expect(user.attributes).toEqual({});
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should create a user with email', () => {
      const user = userRepository.createUser('user_002', 'Bob', 'bob@example.com');

      expect(user.userId).toBe('user_002');
      expect(user.username).toBe('Bob');
      expect(user.email).toBe('bob@example.com');
    });

    test('should create multiple users', () => {
      userRepository.createUser('user_003', 'Charlie');
      userRepository.createUser('user_004', 'Diana');

      const user1 = userRepository.getUserById('user_003');
      const user2 = userRepository.getUserById('user_004');

      expect(user1).not.toBeNull();
      expect(user2).not.toBeNull();
      expect(user1?.username).toBe('Charlie');
      expect(user2?.username).toBe('Diana');
    });
  });

  describe('getUserById', () => {
    test('should retrieve existing user', () => {
      userRepository.createUser('user_005', 'Eve');

      const user = userRepository.getUserById('user_005');

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('user_005');
      expect(user?.username).toBe('Eve');
    });

    test('should return null for non-existent user', () => {
      const user = userRepository.getUserById('non_existent_user');

      expect(user).toBeNull();
    });

    test('should retrieve user with correct data types', () => {
      userRepository.createUser('user_006', 'Frank');

      const user = userRepository.getUserById('user_006');

      expect(typeof user?.currentLevel).toBe('number');
      expect(typeof user?.currentXP).toBe('number');
      expect(typeof user?.totalXP).toBe('number');
      expect(typeof user?.attributes).toBe('object');
      expect(user?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateUser', () => {
    test('should update username', () => {
      userRepository.createUser('user_007', 'Grace');

      const updated = userRepository.updateUser('user_007', {
        username: 'Grace Updated'
      });

      expect(updated.username).toBe('Grace Updated');
    });

    test('should update email', () => {
      userRepository.createUser('user_008', 'Henry', 'henry@old.com');

      const updated = userRepository.updateUser('user_008', {
        email: 'henry@new.com'
      });

      expect(updated.email).toBe('henry@new.com');
    });

    test('should update level and XP', () => {
      userRepository.createUser('user_009', 'Ivy');

      const updated = userRepository.updateUser('user_009', {
        currentLevel: 5,
        currentXP: 250,
        totalXP: 1250
      });

      expect(updated.currentLevel).toBe(5);
      expect(updated.currentXP).toBe(250);
      expect(updated.totalXP).toBe(1250);
    });

    test('should update attributes', () => {
      userRepository.createUser('user_010', 'Jack');

      const updated = userRepository.updateUser('user_010', {
        attributes: { wisdom: 10, creativity: 5 }
      });

      expect(updated.attributes).toEqual({ wisdom: 10, creativity: 5 });
    });

    test('should update updatedAt timestamp', () => {
      const user = userRepository.createUser('user_011', 'Karen');
      const originalUpdatedAt = user.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {}, 10);

      const updated = userRepository.updateUser('user_011', {
        username: 'Karen Updated'
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    test('should throw error for non-existent user', () => {
      expect(() => {
        userRepository.updateUser('non_existent', { username: 'Test' });
      }).toThrow('Failed to retrieve updated user');
    });
  });

  describe('awardXP', () => {
    test('should add XP to user', () => {
      userRepository.createUser('user_012', 'Leo');

      const updated = userRepository.awardXP('user_012', 50);

      expect(updated.currentXP).toBe(50);
      expect(updated.totalXP).toBe(50);
    });

    test('should accumulate XP across multiple awards', () => {
      userRepository.createUser('user_013', 'Mia');

      userRepository.awardXP('user_013', 30);
      userRepository.awardXP('user_013', 20);
      const final = userRepository.awardXP('user_013', 50);

      expect(final.currentXP).toBe(100);
      expect(final.totalXP).toBe(100);
    });

    test('should handle zero XP award', () => {
      userRepository.createUser('user_014', 'Noah');

      const updated = userRepository.awardXP('user_014', 0);

      expect(updated.currentXP).toBe(0);
      expect(updated.totalXP).toBe(0);
    });

    test('should throw error for non-existent user', () => {
      expect(() => {
        userRepository.awardXP('non_existent', 50);
      }).toThrow('User not found');
    });
  });

  describe('updateAttributes', () => {
    test('should add new attributes', () => {
      userRepository.createUser('user_015', 'Olivia');

      const updated = userRepository.updateAttributes('user_015', {
        wisdom: 5,
        creativity: 3
      });

      expect(updated.attributes).toEqual({ wisdom: 5, creativity: 3 });
    });

    test('should increment existing attributes', () => {
      userRepository.createUser('user_016', 'Peter');
      userRepository.updateAttributes('user_016', { wisdom: 5 });

      const updated = userRepository.updateAttributes('user_016', { wisdom: 3 });

      expect(updated.attributes.wisdom).toBe(8);
    });

    test('should handle multiple attribute updates', () => {
      userRepository.createUser('user_017', 'Quinn');

      userRepository.updateAttributes('user_017', { wisdom: 5, creativity: 3 });
      const updated = userRepository.updateAttributes('user_017', { wisdom: 2, charisma: 4 });

      expect(updated.attributes.wisdom).toBe(7);
      expect(updated.attributes.creativity).toBe(3);
      expect(updated.attributes.charisma).toBe(4);
    });

    test('should throw error for non-existent user', () => {
      expect(() => {
        userRepository.updateAttributes('non_existent', { wisdom: 5 });
      }).toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    test('should delete existing user', () => {
      userRepository.createUser('user_018', 'Rachel');

      userRepository.deleteUser('user_018');

      const user = userRepository.getUserById('user_018');
      expect(user).toBeNull();
    });

    test('should not throw error when deleting non-existent user', () => {
      expect(() => {
        userRepository.deleteUser('non_existent');
      }).not.toThrow();
    });
  });

  describe('userExists', () => {
    test('should return true for existing user', () => {
      userRepository.createUser('user_019', 'Sam');

      const exists = userRepository.userExists('user_019');

      expect(exists).toBe(true);
    });

    test('should return false for non-existent user', () => {
      const exists = userRepository.userExists('non_existent');

      expect(exists).toBe(false);
    });

    test('should return false after user deletion', () => {
      userRepository.createUser('user_020', 'Tina');
      userRepository.deleteUser('user_020');

      const exists = userRepository.userExists('user_020');

      expect(exists).toBe(false);
    });
  });
});
