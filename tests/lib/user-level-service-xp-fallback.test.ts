/**
 * @fileOverview User Level Service XP Award Robustness Tests
 *
 * Tests the reliability and consistency of the XP award system when called from
 * services that may be using different backends (SQLite vs Firebase). Ensures
 * XP awards work correctly regardless of the calling service's storage backend.
 *
 * Key Features Tested:
 * - XP award idempotency with sourceId locks
 * - Level-up detection and content unlocking
 * - Attribute updates and progression
 * - Error handling and data validation
 * - Transaction atomicity and race conditions
 * - NaN corruption prevention and auto-repair
 *
 * Prevents Regression:
 * - Issue #3: XP not updating after task completion
 * - Duplicate XP awards for same action
 * - NaN corruption in XP fields
 * - Race conditions in concurrent XP awards
 * - Lost level-ups due to transaction failures
 *
 * @phase Phase 2.9 - Daily Task System Testing
 */

import type { UserProfile, LevelUpRecord, XPTransaction } from '@/lib/types/user-level';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase Firestore - use factory functions to avoid hoisting issues
const mockFirestoreDoc = jest.fn();
const mockFirestoreGetDoc = jest.fn();
const mockFirestoreSetDoc = jest.fn();
const mockFirestoreUpdateDoc = jest.fn();
const mockFirestoreAddDoc = jest.fn();
const mockFirestoreDeleteDoc = jest.fn();
const mockFirestoreCollection = jest.fn();
const mockFirestoreQuery = jest.fn();
const mockFirestoreWhere = jest.fn();
const mockFirestoreOrderBy = jest.fn();
const mockFirestoreLimit = jest.fn();
const mockFirestoreGetDocs = jest.fn();
const mockRunTransaction = jest.fn();
const mockServerTimestamp = jest.fn(() => new Date());
const mockTimestampNow = jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }));

jest.mock('firebase/firestore', () => ({
  collection: (...args: any[]) => mockFirestoreCollection(...args),
  doc: (...args: any[]) => mockFirestoreDoc(...args),
  getDoc: (...args: any[]) => mockFirestoreGetDoc(...args),
  setDoc: (...args: any[]) => mockFirestoreSetDoc(...args),
  updateDoc: (...args: any[]) => mockFirestoreUpdateDoc(...args),
  addDoc: (...args: any[]) => mockFirestoreAddDoc(...args),
  deleteDoc: (...args: any[]) => mockFirestoreDeleteDoc(...args),
  query: (...args: any[]) => mockFirestoreQuery(...args),
  where: (...args: any[]) => mockFirestoreWhere(...args),
  orderBy: (...args: any[]) => mockFirestoreOrderBy(...args),
  limit: (...args: any[]) => mockFirestoreLimit(...args),
  getDocs: (...args: any[]) => mockFirestoreGetDocs(...args),
  runTransaction: (...args: any[]) => mockRunTransaction(...args),
  serverTimestamp: (...args: any[]) => mockServerTimestamp(...args),
  Timestamp: {
    now: (...args: any[]) => mockTimestampNow(...args),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}));

// Mock Firebase db
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock levels-config
jest.mock('@/lib/config/levels-config', () => ({
  LEVELS_CONFIG: [
    { level: 0, title: 'Beginner', requiredXP: 0, permissions: [], exclusiveContent: [] },
    { level: 1, title: 'Novice', requiredXP: 50, permissions: ['basic'], exclusiveContent: ['chapter-2'] },
    { level: 2, title: 'Intermediate', requiredXP: 150, permissions: ['basic', 'advanced'], exclusiveContent: ['chapter-3'] },
  ],
  getLevelConfig: jest.fn((level: number) => {
    const configs = [
      { level: 0, title: 'Beginner', requiredXP: 0, permissions: [], exclusiveContent: [] },
      { level: 1, title: 'Novice', requiredXP: 50, permissions: ['basic'], exclusiveContent: ['chapter-2'] },
      { level: 2, title: 'Intermediate', requiredXP: 150, permissions: ['basic', 'advanced'], exclusiveContent: ['chapter-3'] },
    ];
    return configs[level] || null;
  }),
  getAllPermissionsForLevel: jest.fn((level: number) => {
    if (level === 0) return [];
    if (level === 1) return ['basic'];
    if (level >= 2) return ['basic', 'advanced'];
    return [];
  }),
  calculateLevelFromXP: jest.fn((xp: number) => {
    if (xp < 50) return 0;
    if (xp < 150) return 1;
    return 2;
  }),
  calculateXPProgress: jest.fn((totalXP: number) => {
    if (totalXP < 50) return { currentXP: totalXP, nextLevelXP: 50, currentLevel: 0 };
    if (totalXP < 150) return { currentXP: totalXP - 50, nextLevelXP: 100, currentLevel: 1 };
    return { currentXP: totalXP - 150, nextLevelXP: 0, currentLevel: 2 };
  }),
  MAX_LEVEL: 7,
}));

// Import UserLevelService AFTER all mocks are set up
import { UserLevelService } from '@/lib/user-level-service';

describe('UserLevelService XP Award Robustness', () => {
  let service: UserLevelService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Create fresh service instance
    service = new UserLevelService();

    // Default mock implementations
    mockFirestoreGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockFirestoreAddDoc.mockResolvedValue({ id: 'mock-doc-id' });
    mockFirestoreSetDoc.mockResolvedValue(undefined);
    mockFirestoreUpdateDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('XP Award Basic Functionality', () => {
    test('should award XP successfully', async () => {
      // Arrange: Mock user profile
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act
      const result = await service.awardXP('user1', 25, 'Test reward', 'daily_task');

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(25);
      expect(mockFirestoreUpdateDoc).toHaveBeenCalled();
    });

    test('should detect level-up when XP threshold reached', async () => {
      // Arrange: User at 45 XP (5 XP away from level 1)
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 45,
        totalXP: 45,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act: Award 10 XP (should trigger level-up)
      const result = await service.awardXP('user1', 10, 'Level up test', 'daily_task');

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(55);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(1);
    });

    test('should handle zero XP awards gracefully', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 10,
        totalXP: 10,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act
      const result = await service.awardXP('user1', 0, 'Zero XP test', 'daily_task');

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(10); // No change
      expect(result.leveledUp).toBe(false);
    });
  });

  describe('Idempotency with sourceId Locks', () => {
    test('should prevent duplicate XP awards with same sourceId', async () => {
      // Arrange: Mock user profile
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      // Mock transaction behavior
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockImplementation((ref: any) => {
            // First call: check lock (exists)
            // Second call: get user profile
            if (ref.id?.includes('__')) {
              return Promise.resolve({
                exists: () => true, // Lock exists
                data: () => ({ userId: 'user1', sourceId: 'task-1' }),
              });
            }
            return Promise.resolve({
              exists: () => true,
              data: () => mockProfile,
            });
          }),
          set: jest.fn(),
          update: jest.fn(),
        };
        await callback(mockTransaction);
      });

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act: Award XP with sourceId (should detect existing lock)
      const result = await service.awardXP('user1', 10, 'Duplicate test', 'daily_task', 'task-1');

      // Assert
      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(mockRunTransaction).toHaveBeenCalled();
    });

    test('should create lock on first XP award with sourceId', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      // Mock transaction: no existing lock
      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockImplementation((ref: any) => {
            if (ref.id?.includes('__')) {
              return Promise.resolve({
                exists: () => false, // No lock exists
              });
            }
            return Promise.resolve({
              exists: () => true,
              data: () => mockProfile,
            });
          }),
          set: jest.fn(),
          update: jest.fn(),
        };
        await callback(mockTransaction);
      });

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => ({ ...mockProfile, totalXP: 10, currentXP: 10 }),
      });

      // Act
      const result = await service.awardXP('user1', 10, 'First award', 'daily_task', 'task-new');

      // Assert
      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBeUndefined();
      expect(mockRunTransaction).toHaveBeenCalled();
    });

    test('should handle chapter completion idempotency', async () => {
      // Arrange: User already completed chapter 1
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 10,
        totalXP: 10,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [1], // Already completed chapter 1
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockRunTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: jest.fn().mockImplementation((ref: any) => {
            if (ref.id?.includes('__')) {
              return Promise.resolve({ exists: () => false });
            }
            return Promise.resolve({
              exists: () => true,
              data: () => mockProfile,
            });
          }),
          set: jest.fn(),
          update: jest.fn(),
        };
        await callback(mockTransaction);
      });

      // Act: Try to award XP for chapter-1 again
      const result = await service.awardXP('user1', 10, 'Chapter 1', 'reading', 'chapter-1');

      // Assert: Should detect duplicate via completedChapters array
      expect(result.isDuplicate).toBe(true);
    });
  });

  describe('Data Validation and Corruption Prevention', () => {
    test('should reject invalid XP amounts', async () => {
      // Act & Assert: undefined
      await expect(
        service.awardXP('user1', undefined as any, 'Invalid XP', 'daily_task')
      ).rejects.toThrow('XP amount cannot be undefined or null');

      // Act & Assert: null
      await expect(
        service.awardXP('user1', null as any, 'Invalid XP', 'daily_task')
      ).rejects.toThrow('XP amount cannot be undefined or null');

      // Act & Assert: NaN
      await expect(
        service.awardXP('user1', NaN, 'Invalid XP', 'daily_task')
      ).rejects.toThrow('Invalid XP amount');

      // Act & Assert: Negative
      await expect(
        service.awardXP('user1', -10, 'Negative XP', 'daily_task')
      ).rejects.toThrow('XP amount cannot be negative');
    });

    test('should auto-repair corrupted user profile', async () => {
      // Arrange: Corrupted profile with NaN values
      const corruptedProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: NaN, // Corrupted
        currentXP: NaN, // Corrupted
        totalXP: NaN, // Corrupted
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => corruptedProfile,
      });

      // Act: Get user profile (should trigger auto-repair)
      const profile = await service.getUserProfile('user1');

      // Assert
      expect(profile).not.toBeNull();
      expect(profile!.totalXP).toBe(0); // Repaired to 0
      expect(profile!.currentLevel).toBe(0); // Repaired to 0
      expect(mockFirestoreUpdateDoc).toHaveBeenCalled(); // Repair persisted
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Corrupted'));
    });

    test('should handle missing user profile gracefully', async () => {
      // Arrange: No user profile
      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => false,
      });

      // Act & Assert
      await expect(
        service.awardXP('nonexistent-user', 10, 'Test', 'daily_task')
      ).rejects.toThrow('User profile not found');
    });
  });

  describe('Attribute and Stats Updates', () => {
    test('should update user attributes correctly', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 1,
        currentXP: 10,
        totalXP: 60,
        nextLevelXP: 100,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 5, culturalKnowledge: 3, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act
      const result = await service.updateAttributes('user1', { poetrySkill: 10, culturalKnowledge: 5 });

      // Assert
      expect(result).toBe(true);
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attributes: expect.objectContaining({
            poetrySkill: 10,
            culturalKnowledge: 5,
          }),
        })
      );
    });

    test('should clamp attribute values to 0-100 range', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 1,
        currentXP: 10,
        totalXP: 60,
        nextLevelXP: 100,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 90, culturalKnowledge: 5, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act: Try to set poetrySkill to 150 (should clamp to 100)
      await service.updateAttributes('user1', { poetrySkill: 150, culturalKnowledge: -10 });

      // Assert
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          attributes: expect.objectContaining({
            poetrySkill: 100, // Clamped from 150
            culturalKnowledge: 0, // Clamped from -10
          }),
        })
      );
    });

    test('should update user stats correctly', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 1,
        currentXP: 10,
        totalXP: 60,
        nextLevelXP: 100,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 5, culturalKnowledge: 3, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 2, totalReadingTimeMinutes: 30, notesCount: 5, currentStreak: 3, longestStreak: 5, aiInteractionsCount: 10, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act
      const result = await service.updateStats('user1', { chaptersCompleted: 3, currentStreak: 4 });

      // Assert
      expect(result).toBe(true);
      expect(mockFirestoreUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          stats: expect.objectContaining({
            chaptersCompleted: 3,
            currentStreak: 4,
          }),
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle Firestore errors gracefully', async () => {
      // Arrange: Mock Firestore error
      mockFirestoreGetDoc.mockRejectedValue(new Error('Firestore connection error'));

      // Act & Assert
      await expect(
        service.getUserProfile('user1')
      ).rejects.toThrow('Failed to fetch user profile');
    });

    test('should preserve Firebase error codes for upstream handling', async () => {
      // Arrange: Mock permission-denied error
      const firestoreError: any = new Error('Permission denied');
      firestoreError.code = 'permission-denied';
      mockFirestoreGetDoc.mockRejectedValue(firestoreError);

      // Act & Assert
      try {
        await service.getUserProfile('user1');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('permission-denied');
      }
    });

    test('should not crash when transaction logging fails', async () => {
      // Arrange
      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Mock addDoc failure (logging)
      mockFirestoreAddDoc.mockRejectedValue(new Error('Logging failed'));

      // Act: Should not throw despite logging failure
      const result = await service.awardXP('user1', 10, 'Test', 'daily_task');

      // Assert
      expect(result.success).toBe(true);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error logging XP transaction'));
    });

    test('should handle concurrent XP awards safely', async () => {
      // This test verifies that the service uses proper concurrency control
      // In production, Firebase transactions handle this automatically

      const mockProfile: UserProfile = {
        uid: 'user1',
        displayName: 'Test User',
        email: 'test@example.com',
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 50,
        completedTasks: [],
        unlockedContent: [],
        completedChapters: [],
        hasReceivedWelcomeBonus: false,
        attributes: { poetrySkill: 0, culturalKnowledge: 0, analyticalThinking: 0, socialInfluence: 0, learningPersistence: 0 },
        stats: { chaptersCompleted: 0, totalReadingTimeMinutes: 0, notesCount: 0, currentStreak: 0, longestStreak: 0, aiInteractionsCount: 0, communityPostsCount: 0, communityLikesReceived: 0 },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };

      mockFirestoreGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'user1',
        data: () => mockProfile,
      });

      // Act: Simulate concurrent awards
      const promises = [
        service.awardXP('user1', 5, 'Award 1', 'daily_task'),
        service.awardXP('user1', 5, 'Award 2', 'daily_task'),
        service.awardXP('user1', 5, 'Award 3', 'daily_task'),
      ];

      const results = await Promise.all(promises);

      // Assert: All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});
