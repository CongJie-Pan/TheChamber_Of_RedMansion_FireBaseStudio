/**
 * @fileOverview User Repository Tests
 *
 * Unit tests for user CRUD operations with Turso/LibSQL
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

// Mock data storage to simulate database
const mockUsersData: Map<string, any> = new Map();

// Create mock database that simulates libSQL client API
const mockExecute = jest.fn(async (params: { sql: string; args?: any[] }) => {
  const { sql, args = [] } = params;

  // Handle INSERT INTO users
  if (sql.includes('INSERT INTO users')) {
    const [id, username, email, passwordHash, isGuest, currentLevel, currentXP, totalXP,
           attributes, completedTasks, unlockedContent, completedChapters,
           hasReceivedWelcomeBonus, stats, createdAt, updatedAt, lastActivityAt] = args;
    mockUsersData.set(id, {
      id, username, email, passwordHash, isGuest, currentLevel, currentXP, totalXP,
      attributes, completedTasks, unlockedContent, completedChapters,
      hasReceivedWelcomeBonus, stats, createdAt, updatedAt, lastActivityAt
    });
    return { rows: [], rowsAffected: 1 };
  }

  // Handle SELECT * FROM users WHERE id = ?
  if (sql.includes('SELECT * FROM users WHERE id = ?') || sql.includes('SELECT * FROM users WHERE id =')) {
    const id = args[0];
    const user = mockUsersData.get(id);
    return { rows: user ? [user] : [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM users WHERE username = ?
  if (sql.includes('SELECT * FROM users WHERE username = ?') || sql.includes('WHERE username =')) {
    const username = args[0];
    for (const user of mockUsersData.values()) {
      if (user.username === username) {
        return { rows: [user], rowsAffected: 0 };
      }
    }
    return { rows: [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM users WHERE email = ?
  if (sql.includes('SELECT * FROM users WHERE email = ?') || sql.includes('WHERE email =')) {
    const email = args[0];
    for (const user of mockUsersData.values()) {
      if (user.email === email) {
        return { rows: [user], rowsAffected: 0 };
      }
    }
    return { rows: [], rowsAffected: 0 };
  }

  // Handle SELECT COUNT(*) as count FROM users WHERE id = ?
  if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM users WHERE id = ?')) {
    const id = args[0];
    const exists = mockUsersData.has(id);
    return { rows: [{ count: exists ? 1 : 0 }], rowsAffected: 0 };
  }

  // Handle UPDATE users - parse SET clause properly
  if (sql.includes('UPDATE users')) {
    const userId = args[args.length - 1]; // userId is the last arg for WHERE clause
    const user = mockUsersData.get(userId);
    if (user) {
      // Extract SET clause and parse field names
      const setMatch = sql.match(/SET\s+([\s\S]*?)\s+WHERE/i);
      if (setMatch) {
        const setClause = setMatch[1];
        const fieldAssignments = setClause.split(',').map(f => f.trim());

        // Map each field to its argument index
        for (let i = 0; i < fieldAssignments.length; i++) {
          const fieldName = fieldAssignments[i].split('=')[0].trim();
          const value = args[i];

          // Update the corresponding field in user object
          switch (fieldName) {
            case 'username':
              user.username = value;
              break;
            case 'email':
              user.email = value;
              break;
            case 'passwordHash':
              user.passwordHash = value;
              break;
            case 'currentLevel':
              user.currentLevel = value;
              break;
            case 'currentXP':
              user.currentXP = value;
              break;
            case 'totalXP':
              user.totalXP = value;
              break;
            case 'attributes':
              user.attributes = value;
              break;
            case 'updatedAt':
              user.updatedAt = value;
              break;
            case 'completedTasks':
              user.completedTasks = value;
              break;
            case 'unlockedContent':
              user.unlockedContent = value;
              break;
            case 'completedChapters':
              user.completedChapters = value;
              break;
            case 'hasReceivedWelcomeBonus':
              user.hasReceivedWelcomeBonus = value;
              break;
            case 'stats':
              user.stats = value;
              break;
            case 'lastActivityAt':
              user.lastActivityAt = value;
              break;
          }
        }
      }
      mockUsersData.set(userId, user);
    }
    return { rows: [], rowsAffected: user ? 1 : 0 };
  }

  // Handle DELETE FROM users WHERE id = ?
  if (sql.includes('DELETE FROM users WHERE id = ?') || sql.includes('DELETE FROM users WHERE id =')) {
    const id = args[0];
    const deleted = mockUsersData.delete(id);
    return { rows: [], rowsAffected: deleted ? 1 : 0 };
  }

  // Default: return empty result
  return { rows: [], rowsAffected: 0 };
});

const mockDb = {
  execute: mockExecute,
  batch: jest.fn(),
  close: jest.fn(),
};

// Mock the sqlite-db module
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => mockDb),
  toUnixTimestamp: (date: Date) => date.getTime(),
  fromUnixTimestamp: (timestamp: number) => new Date(timestamp),
}));

// Mock guest account middleware
jest.mock('@/lib/middleware/guest-account', () => ({
  isGuestAccount: jest.fn((userId: string) => userId === 'guest-user-fixed-id'),
}));

import * as userRepository from '@/lib/repositories/user-repository';

describe('User Repository', () => {
  beforeEach(() => {
    // Clear mock data between tests
    mockUsersData.clear();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('should create a new user with default values', async () => {
      const user = await userRepository.createUser('user_001', 'Alice');

      expect(user.userId).toBe('user_001');
      expect(user.username).toBe('Alice');
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

    test('should create a user with email', async () => {
      const user = await userRepository.createUser('user_002', 'Bob', 'bob@example.com');

      expect(user.userId).toBe('user_002');
      expect(user.username).toBe('Bob');
      expect(user.email).toBe('bob@example.com');
    });

    test('should create multiple users', async () => {
      await userRepository.createUser('user_003', 'Charlie');
      await userRepository.createUser('user_004', 'Diana');

      const user1 = await userRepository.getUserById('user_003');
      const user2 = await userRepository.getUserById('user_004');

      expect(user1).not.toBeNull();
      expect(user2).not.toBeNull();
      expect(user1?.username).toBe('Charlie');
      expect(user2?.username).toBe('Diana');
    });
  });

  describe('getUserById', () => {
    test('should retrieve existing user', async () => {
      await userRepository.createUser('user_005', 'Eve');

      const user = await userRepository.getUserById('user_005');

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('user_005');
      expect(user?.username).toBe('Eve');
    });

    test('should return null for non-existent user', async () => {
      const user = await userRepository.getUserById('non_existent_user');

      expect(user).toBeNull();
    });

    test('should retrieve user with correct data types', async () => {
      await userRepository.createUser('user_006', 'Frank');

      const user = await userRepository.getUserById('user_006');

      expect(typeof user?.currentLevel).toBe('number');
      expect(typeof user?.currentXP).toBe('number');
      expect(typeof user?.totalXP).toBe('number');
      expect(typeof user?.attributes).toBe('object');
      expect(user?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateUser', () => {
    test('should update username', async () => {
      await userRepository.createUser('user_007', 'Grace');

      const updated = await userRepository.updateUser('user_007', {
        username: 'Grace Updated'
      });

      expect(updated.username).toBe('Grace Updated');
    });

    test('should update email', async () => {
      await userRepository.createUser('user_008', 'Henry', 'henry@old.com');

      const updated = await userRepository.updateUser('user_008', {
        email: 'henry@new.com'
      });

      expect(updated.email).toBe('henry@new.com');
    });

    test('should update level and XP', async () => {
      await userRepository.createUser('user_009', 'Ivy');

      const updated = await userRepository.updateUser('user_009', {
        currentLevel: 5,
        currentXP: 250,
        totalXP: 1250
      });

      expect(updated.currentLevel).toBe(5);
      expect(updated.currentXP).toBe(250);
      expect(updated.totalXP).toBe(1250);
    });

    test('should update attributes', async () => {
      await userRepository.createUser('user_010', 'Jack');

      const updated = await userRepository.updateUser('user_010', {
        attributes: { wisdom: 10, creativity: 5 } as any
      });

      expect(updated.attributes).toEqual({ wisdom: 10, creativity: 5 });
    });

    test('should update updatedAt timestamp', async () => {
      const user = await userRepository.createUser('user_011', 'Karen');
      const originalUpdatedAt = user.updatedAt;

      // Small delay to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await userRepository.updateUser('user_011', {
        username: 'Karen Updated'
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    test('should throw error for non-existent user', async () => {
      await expect(
        userRepository.updateUser('non_existent', { username: 'Test' })
      ).rejects.toThrow('Failed to retrieve updated user');
    });

    test('should update password hash field', async () => {
      const created = await userRepository.createUser('user_pw', 'SecureUser', 'secure@example.com');
      expect(created.passwordHash).toBeUndefined();

      const updated = await userRepository.updateUser('user_pw', {
        passwordHash: '$2b$10$dummydummydummydummydum',
      });

      expect(updated.passwordHash).toBe('$2b$10$dummydummydummydummydum');
    });
  });

  describe('updateUserPasswordHash', () => {
    test('should update hash via helper', async () => {
      await userRepository.createUser('user_helper', 'Helper');
      const result = await userRepository.updateUserPasswordHash('user_helper', '$2b$10$helperhelperhelperhelpe');

      expect(result.passwordHash).toBe('$2b$10$helperhelperhelperhelpe');
    });

    test('should throw if user missing', async () => {
      await expect(
        userRepository.updateUserPasswordHash('missing-user', '$2b$10$missingmissingmissingmissi')
      ).rejects.toThrow('User not found: missing-user');
    });
  });

  describe('awardXP', () => {
    test('should add XP to user', async () => {
      await userRepository.createUser('user_012', 'Leo');

      const updated = await userRepository.awardXP('user_012', 50);

      expect(updated.currentXP).toBe(50);
      expect(updated.totalXP).toBe(50);
    });

    test('should accumulate XP across multiple awards', async () => {
      await userRepository.createUser('user_013', 'Mia');

      await userRepository.awardXP('user_013', 30);
      await userRepository.awardXP('user_013', 20);
      const final = await userRepository.awardXP('user_013', 50);

      expect(final.currentXP).toBe(100);
      expect(final.totalXP).toBe(100);
    });

    test('should handle zero XP award', async () => {
      await userRepository.createUser('user_014', 'Noah');

      const updated = await userRepository.awardXP('user_014', 0);

      expect(updated.currentXP).toBe(0);
      expect(updated.totalXP).toBe(0);
    });

    test('should throw error for non-existent user', async () => {
      await expect(
        userRepository.awardXP('non_existent', 50)
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateAttributes', () => {
    test('should add new attributes', async () => {
      await userRepository.createUser('user_015', 'Olivia');

      const updated = await userRepository.updateAttributes('user_015', {
        wisdom: 5,
        creativity: 3
      });

      expect(updated.attributes).toEqual({
        poetrySkill: 0,
        culturalKnowledge: 0,
        analyticalThinking: 0,
        socialInfluence: 0,
        learningPersistence: 0,
        wisdom: 5,
        creativity: 3,
      });
    });

    test('should increment existing attributes', async () => {
      await userRepository.createUser('user_016', 'Peter');
      await userRepository.updateAttributes('user_016', { wisdom: 5 });

      const updated = await userRepository.updateAttributes('user_016', { wisdom: 3 });

      expect(updated.attributes.wisdom).toBe(8);
    });

    test('should handle multiple attribute updates', async () => {
      await userRepository.createUser('user_017', 'Quinn');

      await userRepository.updateAttributes('user_017', { wisdom: 5, creativity: 3 });
      const updated = await userRepository.updateAttributes('user_017', { wisdom: 2, charisma: 4 });

      expect(updated.attributes.wisdom).toBe(7);
      expect(updated.attributes.creativity).toBe(3);
      expect(updated.attributes.charisma).toBe(4);
    });

    test('should throw error for non-existent user', async () => {
      await expect(
        userRepository.updateAttributes('non_existent', { wisdom: 5 })
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    test('should delete existing user', async () => {
      await userRepository.createUser('user_018', 'Rachel');

      await userRepository.deleteUser('user_018');

      const user = await userRepository.getUserById('user_018');
      expect(user).toBeNull();
    });

    test('should not throw error when deleting non-existent user', async () => {
      await expect(
        userRepository.deleteUser('non_existent')
      ).resolves.not.toThrow();
    });
  });

  describe('userExists', () => {
    test('should return true for existing user', async () => {
      await userRepository.createUser('user_019', 'Sam');

      const exists = await userRepository.userExists('user_019');

      expect(exists).toBe(true);
    });

    test('should return false for non-existent user', async () => {
      const exists = await userRepository.userExists('non_existent');

      expect(exists).toBe(false);
    });

    test('should return false after user deletion', async () => {
      await userRepository.createUser('user_020', 'Tina');
      await userRepository.deleteUser('user_020');

      const exists = await userRepository.userExists('user_020');

      expect(exists).toBe(false);
    });
  });

  /**
   * Task 4.8: getUserByUsername tests
   * Tests for username lookup functionality for registration uniqueness check
   */
  describe('getUserByUsername (Task 4.8)', () => {
    test('should return user when username exists', async () => {
      await userRepository.createUser('user_username_001', 'UniqueUser');

      const user = await userRepository.getUserByUsername('UniqueUser');

      expect(user).not.toBeNull();
      expect(user?.userId).toBe('user_username_001');
      expect(user?.username).toBe('UniqueUser');
    });

    test('should return null when username does not exist', async () => {
      const user = await userRepository.getUserByUsername('NonExistentUsername');

      expect(user).toBeNull();
    });

    test('should be case-sensitive for username lookup', async () => {
      await userRepository.createUser('user_username_002', 'CaseSensitive');

      // Exact match should work
      const exactMatch = await userRepository.getUserByUsername('CaseSensitive');
      expect(exactMatch).not.toBeNull();

      // Different case should not match
      const wrongCase = await userRepository.getUserByUsername('casesensitive');
      expect(wrongCase).toBeNull();

      const upperCase = await userRepository.getUserByUsername('CASESENSITIVE');
      expect(upperCase).toBeNull();
    });

    test('should handle Chinese username correctly', async () => {
      await userRepository.createUser('user_username_003', '林黛玉');

      const user = await userRepository.getUserByUsername('林黛玉');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('林黛玉');
    });

    test('should handle mixed Chinese/English username', async () => {
      await userRepository.createUser('user_username_004', '紅樓Reader123');

      const user = await userRepository.getUserByUsername('紅樓Reader123');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('紅樓Reader123');
    });

    test('should handle username with underscores', async () => {
      await userRepository.createUser('user_username_005', 'Test_User_Name');

      const user = await userRepository.getUserByUsername('Test_User_Name');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('Test_User_Name');
    });

    test('should return null after user is deleted', async () => {
      await userRepository.createUser('user_username_006', 'ToBeDeleted');
      await userRepository.deleteUser('user_username_006');

      const user = await userRepository.getUserByUsername('ToBeDeleted');

      expect(user).toBeNull();
    });

    test('should find only exact username match among multiple users', async () => {
      await userRepository.createUser('user_username_007', 'Alice');
      await userRepository.createUser('user_username_008', 'AliceSmith');
      await userRepository.createUser('user_username_009', 'Bob');

      const alice = await userRepository.getUserByUsername('Alice');
      const aliceSmith = await userRepository.getUserByUsername('AliceSmith');
      const bob = await userRepository.getUserByUsername('Bob');

      expect(alice?.userId).toBe('user_username_007');
      expect(aliceSmith?.userId).toBe('user_username_008');
      expect(bob?.userId).toBe('user_username_009');
    });
  });
});
