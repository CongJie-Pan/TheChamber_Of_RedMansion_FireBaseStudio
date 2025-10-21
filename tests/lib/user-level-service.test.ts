/**
 * @fileOverview User Level Service Unit Tests
 *
 * Comprehensive test suite for the UserLevelService class including:
 * - Level calculation logic (calculateLevelFromXP)
 * - XP award system (awardXP)
 * - User profile management (initializeUserProfile, getUserProfile)
 * - Permission checking (checkPermissionSync)
 * - Level-up detection and recording
 * - XP transaction logging
 * - Error handling and edge cases
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal operations that users perform daily
 * 2. Edge Cases: Boundary conditions and unusual but valid inputs
 * 3. Failure Cases: Error conditions and invalid inputs
 *
 * Each test includes comprehensive error logging and result tracking.
 */

import { UserLevelService } from '@/lib/user-level-service';
import { calculateLevelFromXP, getLevelConfig, getAllPermissionsForLevel } from '@/lib/config/levels-config';
import { LevelPermission } from '@/lib/types/user-level';
import type { UserProfile } from '@/lib/types/user-level';

// Import Firebase mocks (configured in jest.setup.js)
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  serverTimestamp,
  Timestamp,
  increment,
} from 'firebase/firestore';

describe('UserLevelService', () => {
  let userLevelService: UserLevelService;
  let testLogger: any;

  beforeEach(() => {
    // Initialize service and test logger for each test
    userLevelService = new UserLevelService();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup essential Firebase mocks
    (doc as jest.Mock).mockReturnValue({ id: 'mocked-doc-ref', path: 'mocked/path' });
    (collection as jest.Mock).mockReturnValue({ id: 'mocked-collection-ref' });
    (serverTimestamp as jest.Mock).mockReturnValue({ seconds: Date.now() / 1000 });
  });

  describe('Level Calculation Logic - Expected Use Cases', () => {
    /**
     * Test Case 1: Calculate level for 0 XP (new user)
     *
     * Verifies that users with 0 XP are correctly assigned to level 0
     */
    it('should return level 0 for 0 XP', () => {
      testLogger.log('Testing level calculation for 0 XP');

      // Act
      const level = calculateLevelFromXP(0);

      // Assert
      expect(level).toBe(0);
      testLogger.log('Level 0 test completed', { xp: 0, level });
    });

    /**
     * Test Case 2: Calculate level for various XP amounts
     *
     * Tests the progression through multiple levels with typical XP values
     */
    it('should correctly calculate levels for various XP amounts', () => {
      testLogger.log('Testing level calculation for multiple XP values');

      const testCases = [
        { xp: 0, expectedLevel: 0 },       // 賈府訪客
        { xp: 50, expectedLevel: 0 },      // Still visitor (need 100 for L1)
        { xp: 100, expectedLevel: 1 },     // 陪讀書僮
        { xp: 300, expectedLevel: 2 },     // 門第清客
        { xp: 600, expectedLevel: 3 },     // 庶務管事
        { xp: 1000, expectedLevel: 4 },    // 詩社雅士
        { xp: 1500, expectedLevel: 5 },    // 府中幕賓
        { xp: 2200, expectedLevel: 6 },    // 紅學通儒
        { xp: 3000, expectedLevel: 7 },    // 一代宗師
      ];

      testCases.forEach(({ xp, expectedLevel }) => {
        const level = calculateLevelFromXP(xp);
        expect(level).toBe(expectedLevel);
        testLogger.log(`XP ${xp} -> Level ${level}`, { xp, level, expectedLevel });
      });

      testLogger.log('Multiple level calculation test completed');
    });

    /**
     * Test Case 3: Verify level thresholds are correct
     *
     * Ensures that users just below and just at thresholds are assigned correctly
     */
    it('should handle level threshold boundaries correctly', () => {
      testLogger.log('Testing level threshold boundaries');

      const thresholdTests = [
        { xp: 99, expectedLevel: 0 },   // Just below level 1
        { xp: 100, expectedLevel: 1 },  // Exactly at level 1 threshold
        { xp: 299, expectedLevel: 1 },  // Just below level 2
        { xp: 300, expectedLevel: 2 },  // Exactly at level 2 threshold
      ];

      thresholdTests.forEach(({ xp, expectedLevel }) => {
        const level = calculateLevelFromXP(xp);
        expect(level).toBe(expectedLevel);
      });

      testLogger.log('Threshold boundary test completed');
    });
  });

  describe('Level Calculation Logic - Edge Cases', () => {
    /**
     * Edge Case 1: Very large XP values
     *
     * Ensures the system handles extremely high XP amounts gracefully
     */
    it('should cap at maximum level for very large XP values', () => {
      testLogger.log('Testing very large XP values');

      const veryLargeXP = 999999;
      const level = calculateLevelFromXP(veryLargeXP);

      // Should return level 7 (max level)
      expect(level).toBe(7);
      testLogger.log('Large XP test completed', { xp: veryLargeXP, level });
    });

    /**
     * Edge Case 2: Negative XP values
     *
     * Verifies proper handling of invalid negative XP (should return level 0)
     */
    it('should handle negative XP gracefully', () => {
      testLogger.log('Testing negative XP handling');

      const negativeXP = -100;
      const level = calculateLevelFromXP(negativeXP);

      // Should return level 0 for negative XP
      expect(level).toBe(0);
      testLogger.log('Negative XP test completed', { xp: negativeXP, level });
    });
  });

  describe('User Profile Initialization - Expected Use Cases', () => {
    /**
     * Test Case: Initialize a new user profile successfully
     *
     * Verifies that new user profiles are created with correct default values
     */
    it('should initialize a new user profile with default values', async () => {
      testLogger.log('Testing user profile initialization');

      // Arrange
      const userId = 'test_user_123';
      const displayName = 'Test User';
      const email = 'test@example.com';

      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      const profile = await userLevelService.initializeUserProfile(userId, displayName, email);

      // Assert
      expect(profile).toBeDefined();
      expect(profile.uid).toBe(userId);
      expect(profile.displayName).toBe(displayName);
      expect(profile.email).toBe(email);
      expect(profile.currentLevel).toBe(0);
      expect(profile.currentXP).toBe(0);
      expect(profile.totalXP).toBe(0);
      expect(profile.nextLevelXP).toBe(100); // Level 1 threshold
      expect(profile.completedTasks).toEqual([]);
      // Level 0 exclusive content (check that it's an array with at least some content)
      expect(Array.isArray(profile.unlockedContent)).toBe(true);
      expect(profile.unlockedContent.length).toBeGreaterThan(0);

      expect(setDoc).toHaveBeenCalled();
      testLogger.log('Profile initialization test completed', { userId, profile });
    });

    /**
     * Test Case: Return existing profile if already initialized
     *
     * Ensures that re-initialization doesn't overwrite existing data
     */
    it('should return existing profile if user already has one', async () => {
      testLogger.log('Testing existing profile retrieval');

      // Arrange
      const userId = 'existing_user';
      const existingProfile = {
        uid: userId,
        displayName: 'Existing User',
        email: 'existing@example.com',
        currentLevel: 2,
        currentXP: 150,
        totalXP: 350,
        nextLevelXP: 500,
        completedTasks: ['task1'],
        unlockedContent: ['content1'],
        attributes: {
          literature: 10,
          poetry: 5,
          culture: 8,
          philosophy: 3,
          art: 7
        },
        stats: {
          chaptersCompleted: 5,
          totalReadingTimeMinutes: 120,
          notesCount: 3,
          currentStreak: 2
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now()
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => existingProfile
      });

      // Act
      const profile = await userLevelService.initializeUserProfile(userId, 'Name', 'email@test.com');

      // Assert
      expect(profile.currentLevel).toBe(2); // Should keep existing level
      expect(profile.totalXP).toBe(350);
      expect(setDoc).not.toHaveBeenCalled(); // Should not overwrite

      testLogger.log('Existing profile test completed', { userId });
    });
  });

  describe('XP Award System - Expected Use Cases', () => {
    /**
     * Test Case 1: Award XP without level-up
     *
     * Tests awarding XP when the user doesn't reach the next level
     */
    it('should award XP successfully without level-up', async () => {
      testLogger.log('Testing XP award without level-up');

      // Arrange
      const userId = 'xp_test_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 1,
        currentXP: 50,
        totalXP: 150,
        nextLevelXP: 200,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'transaction_123' });

      // Act
      const result = await userLevelService.awardXP(
        userId,
        10,
        'Test XP award',
        'reading_time',
        'test-source-1'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(160); // 150 + 10
      expect(result.newLevel).toBe(1); // Should stay at level 1
      expect(result.leveledUp).toBe(false);

      expect(updateDoc).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalled(); // XP transaction logged

      testLogger.log('XP award without level-up test completed', { result });
    });

    /**
     * Test Case 2: Award XP with level-up
     *
     * Tests awarding XP when the user reaches the next level
     */
    it('should award XP and trigger level-up', async () => {
      testLogger.log('Testing XP award with level-up');

      // Arrange
      const userId = 'levelup_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 1,
        currentXP: 90,
        totalXP: 190,
        nextLevelXP: 200,  // xpFromPrevious for level 2 (300-100=200)
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'transaction_456' });

      // Act - Award 110 XP to reach 300 total (level 2 threshold)
      const result = await userLevelService.awardXP(
        userId,
        110,
        'Chapter completed',
        'chapter',
        'chapter-1'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(300); // 190 + 110 = 300
      expect(result.newLevel).toBe(2); // Should level up to 2
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(1);

      // Should record level-up
      expect(addDoc).toHaveBeenCalledTimes(2); // Once for transaction, once for level-up

      testLogger.log('XP award with level-up test completed', { result });
    });

    /**
     * Test Case 3: Award multiple XP sources
     *
     * Tests awarding XP from different sources to ensure proper tracking
     */
    it('should handle multiple XP awards from different sources', async () => {
      testLogger.log('Testing multiple XP awards');

      const userId = 'multi_xp_user';
      let currentXP = 50;
      let totalXP = 50;

      // Mock getDoc to return updated profile after each award
      (getDoc as jest.Mock).mockImplementation(() => Promise.resolve({
        exists: () => true,
        data: () => ({
          uid: userId,
          currentLevel: 0,
          currentXP,
          totalXP,
          nextLevelXP: 100,
        })
      }));

      (updateDoc as jest.Mock).mockImplementation(() => {
        // Update local state to simulate persistence
        currentXP += 10;
        totalXP += 10;
        return Promise.resolve();
      });

      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_789' });

      // Act: Award XP from multiple sources
      await userLevelService.awardXP(userId, 10, 'Reading', 'reading_time', 'rt-1');
      await userLevelService.awardXP(userId, 5, 'Note', 'notes', 'note-1');
      await userLevelService.awardXP(userId, 2, 'AI', 'ai_interaction', 'ai-1');

      // Assert
      expect(addDoc).toHaveBeenCalledTimes(3); // Three XP transactions

      testLogger.log('Multiple XP awards test completed');
    });
  });

  describe('XP Award System - Edge Cases', () => {
    /**
     * Edge Case 1: Award 0 XP
     *
     * Verifies handling of edge case where 0 XP is awarded
     */
    it('should handle awarding 0 XP', async () => {
      testLogger.log('Testing 0 XP award');

      const userId = 'zero_xp_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 1,
        currentXP: 50,
        totalXP: 150,
        nextLevelXP: 200,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_zero' });

      // Act
      const result = await userLevelService.awardXP(userId, 0, 'Zero XP test', 'notes', 'test');

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(150); // Should stay the same
      expect(result.leveledUp).toBe(false);

      testLogger.log('Zero XP award test completed');
    });

    /**
     * Edge Case 2: Award XP that skips multiple levels
     *
     * Tests awarding a large amount of XP that jumps multiple levels at once
     */
    it('should handle XP awards that skip multiple levels', async () => {
      testLogger.log('Testing multi-level skip');

      const userId = 'skip_levels_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_skip' });

      // Act: Award 1000 XP (should go from level 0 to level 4)
      const result = await userLevelService.awardXP(userId, 1000, 'Huge XP award', 'chapter', 'test');

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(1000);
      expect(result.newLevel).toBe(4); // Should jump to level 4
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(0);

      testLogger.log('Multi-level skip test completed', { result });
    });
  });

  describe('XP Award System - Failure Cases', () => {
    /**
     * Failure Case 1: Award XP to non-existent user
     *
     * Verifies proper error handling when user profile doesn't exist
     */
    it('should handle awarding XP to non-existent user', async () => {
      testLogger.log('Testing XP award to non-existent user');

      const userId = 'nonexistent_user';

      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      // Act & Assert
      await expect(
        userLevelService.awardXP(userId, 10, 'Test', 'reading_time', 'test')
      ).rejects.toThrow('User profile not found');

      testLogger.log('Non-existent user test completed');
    });

    /**
     * Failure Case 2: Handle Firebase connection failure
     *
     * Ensures proper error handling when Firebase operations fail
     */
    it('should handle Firebase connection failures gracefully', async () => {
      testLogger.log('Testing Firebase failure handling');

      const userId = 'firebase_fail_user';
      const firebaseError = new Error('Firebase: Connection failed');

      (getDoc as jest.Mock).mockRejectedValue(firebaseError);

      // Act & Assert
      await expect(
        userLevelService.awardXP(userId, 10, 'Test', 'reading_time', 'test')
      ).rejects.toThrow();

      testLogger.log('Firebase failure test completed');
    });

    /**
     * Failure Case 3: Handle negative XP awards
     *
     * Verifies that negative XP values are rejected with an error
     */
    it('should reject negative XP awards', async () => {
      testLogger.log('Testing negative XP award rejection');

      const userId = 'negative_xp_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 1,
        currentXP: 50,
        totalXP: 150,
        nextLevelXP: 200,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });

      // Act & Assert: Should throw error for negative XP
      await expect(
        userLevelService.awardXP(userId, -10, 'Negative test', 'notes', 'test')
      ).rejects.toThrow('XP amount cannot be negative');

      testLogger.log('Negative XP award test completed');
    });
  });

  describe('Permission Checking - Expected Use Cases', () => {
    /**
     * Test Case 1: Check basic permissions for level 0
     *
     * Verifies that level 0 users have correct basic permissions
     */
    it('should correctly check permissions for level 0 users', () => {
      testLogger.log('Testing level 0 permissions');

      const level = 0;

      // Level 0 should have BASIC_READING and SIMPLE_AI_QA
      expect(userLevelService.checkPermissionSync(level, LevelPermission.BASIC_READING)).toBe(true);
      expect(userLevelService.checkPermissionSync(level, LevelPermission.SIMPLE_AI_QA)).toBe(true);

      // Level 0 should NOT have advanced permissions
      expect(userLevelService.checkPermissionSync(level, LevelPermission.POETRY_COMPETITION)).toBe(false);
      expect(userLevelService.checkPermissionSync(level, LevelPermission.EXPERT_READINGS_FULL)).toBe(false);

      testLogger.log('Level 0 permissions test completed');
    });

    /**
     * Test Case 2: Check permissions accumulate across levels
     *
     * Verifies that higher levels maintain permissions from lower levels
     */
    it('should accumulate permissions as level increases', () => {
      testLogger.log('Testing permission accumulation');

      const level3 = 3;
      const level0Permissions = getAllPermissionsForLevel(0);
      const level1Permissions = getAllPermissionsForLevel(1);
      const level3Permissions = getAllPermissionsForLevel(level3);

      // Level 3 should have all permissions from levels 0, 1, 2, and 3
      level0Permissions.forEach(permission => {
        expect(userLevelService.checkPermissionSync(level3, permission)).toBe(true);
      });

      level1Permissions.forEach(permission => {
        expect(userLevelService.checkPermissionSync(level3, permission)).toBe(true);
      });

      testLogger.log('Permission accumulation test completed', {
        level3PermissionCount: level3Permissions.length
      });
    });
  });

  describe('Permission Checking - Edge Cases', () => {
    /**
     * Edge Case: Check permissions for maximum level
     *
     * Verifies that max level (7) has all available permissions
     */
    it('should grant all permissions at maximum level', () => {
      testLogger.log('Testing maximum level permissions');

      const maxLevel = 7;
      const allPermissions = Object.values(LevelPermission);

      allPermissions.forEach(permission => {
        expect(userLevelService.checkPermissionSync(maxLevel, permission)).toBe(true);
      });

      testLogger.log('Maximum level permissions test completed', {
        totalPermissions: allPermissions.length
      });
    });
  });

  describe('Level Configuration - Expected Use Cases', () => {
    /**
     * Test Case: Verify level configuration consistency
     *
     * Ensures all level configs have required fields and proper structure
     */
    it('should have valid configuration for all levels', () => {
      testLogger.log('Testing level configuration validity');

      for (let level = 0; level <= 7; level++) {
        const config = getLevelConfig(level);

        // Assert all required fields exist
        expect(config).toBeDefined();
        expect(config.id).toBe(level);
        expect(config.title).toBeDefined();
        expect(config.titleEn).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.requiredXP).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(config.permissions)).toBe(true);
        expect(Array.isArray(config.exclusiveContent)).toBe(true);
        expect(config.visualRewards).toBeDefined();
        expect(config.virtualResidence).toBeDefined();

        testLogger.log(`Level ${level} config valid`, {
          level,
          title: config.title,
          requiredXP: config.requiredXP
        });
      }

      testLogger.log('Level configuration validity test completed');
    });

    /**
     * Test Case: Verify XP thresholds are in ascending order
     *
     * Ensures that required XP increases with each level
     */
    it('should have ascending XP thresholds', () => {
      testLogger.log('Testing XP threshold ordering');

      let previousXP = -1;

      for (let level = 0; level <= 7; level++) {
        const config = getLevelConfig(level);
        expect(config.requiredXP).toBeGreaterThan(previousXP);
        previousXP = config.requiredXP;
      }

      testLogger.log('XP threshold ordering test completed');
    });
  });

  describe('Community Level-Up Detection - Expected Use Cases', () => {
    /**
     * Test Case 1: Level up from 0 to 1 (Community first level-up)
     *
     * Verifies that level-up detection works correctly when reaching Level 1 (100 XP threshold)
     * This is the most common community level-up scenario
     */
    it('should correctly detect level-up from Level 0 to 1', async () => {
      testLogger.log('Testing Level 0 to 1 level-up detection');

      // Arrange
      const userId = 'community_user_1';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 90,
        totalXP: 90,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_levelup' });

      // Act: Award 10 XP to reach exactly 100 XP (Level 1 threshold)
      const result = await userLevelService.awardXP(
        userId,
        10,
        'Community post created',
        'community_post',
        'post-123'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(100); // Exactly at threshold
      expect(result.newLevel).toBe(1); // Should be Level 1
      expect(result.leveledUp).toBe(true); // Should detect level-up
      expect(result.fromLevel).toBe(0); // From Level 0
      expect(result.newLevel).toBe(1); // To Level 1

      testLogger.log('Level 0 to 1 detection test completed', { result });
    });

    /**
     * Test Case 2: Level up values for community posting (10 XP)
     *
     * Simulates typical community posting XP award
     */
    it('should handle community post XP award (10 XP) correctly', async () => {
      testLogger.log('Testing community post XP award');

      // Arrange
      const userId = 'community_poster';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 91,
        totalXP: 91,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_post' });

      // Act: Award 10 XP for creating a post
      const result = await userLevelService.awardXP(
        userId,
        10,
        'Posted to community',
        'community_post',
        'post-456'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(101); // 91 + 10 = 101
      expect(result.leveledUp).toBe(true); // Should level up
      expect(result.fromLevel).toBe(0);
      expect(result.newLevel).toBe(1);

      testLogger.log('Community post XP test completed');
    });

    /**
     * Test Case 3: Level up values for community like (5 XP)
     *
     * Simulates typical community like XP award
     */
    it('should handle community like XP award (5 XP) correctly', async () => {
      testLogger.log('Testing community like XP award');

      // Arrange
      const userId = 'community_liker';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 96,
        totalXP: 96,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_like' });

      // Act: Award 5 XP for liking a post
      const result = await userLevelService.awardXP(
        userId,
        5,
        'Liked community post',
        'community_like',
        'post-789'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(101); // 96 + 5 = 101
      expect(result.leveledUp).toBe(true); // Should level up
      expect(result.fromLevel).toBe(0);
      expect(result.newLevel).toBe(1);

      testLogger.log('Community like XP test completed');
    });

    /**
     * Test Case 4: Level up values for community comment (3 XP)
     *
     * Simulates typical community comment XP award
     */
    it('should handle community comment XP award (3 XP) correctly', async () => {
      testLogger.log('Testing community comment XP award');

      // Arrange
      const userId = 'community_commenter';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 98,
        totalXP: 98,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_comment' });

      // Act: Award 3 XP for commenting on a post
      const result = await userLevelService.awardXP(
        userId,
        3,
        'Commented on community post',
        'community_comment',
        'comment-001'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(101); // 98 + 3 = 101
      expect(result.leveledUp).toBe(true); // Should level up
      expect(result.fromLevel).toBe(0);
      expect(result.newLevel).toBe(1);

      testLogger.log('Community comment XP test completed');
    });

    /**
     * Test Case 5: No level-up when XP is insufficient
     *
     * Verifies that level-up is NOT detected when user doesn't reach threshold
     */
    it('should not trigger level-up when XP is insufficient', async () => {
      testLogger.log('Testing no level-up scenario');

      // Arrange
      const userId = 'community_no_levelup';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 50,
        totalXP: 50,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_no_levelup' });

      // Act: Award 10 XP (still below threshold)
      const result = await userLevelService.awardXP(
        userId,
        10,
        'Community interaction',
        'community_post',
        'post-999'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(60); // 50 + 10 = 60 (below 100)
      expect(result.newLevel).toBe(0); // Should still be Level 0
      expect(result.leveledUp).toBe(false); // Should NOT level up
      expect(result.fromLevel).toBeUndefined(); // No fromLevel when not leveling up

      testLogger.log('No level-up test completed');
    });
  });

  describe('Community Level-Up Detection - Edge Cases', () => {
    /**
     * Edge Case 1: Exact threshold boundary (100 XP)
     *
     * Verifies level-up detection at exact threshold
     */
    it('should detect level-up at exact 100 XP threshold', async () => {
      testLogger.log('Testing exact threshold level-up');

      // Arrange
      const userId = 'exact_threshold_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 95,
        totalXP: 95,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_exact' });

      // Act: Award exactly 5 XP to reach 100
      const result = await userLevelService.awardXP(
        userId,
        5,
        'Community like',
        'community_like',
        'test'
      );

      // Assert
      expect(result.newTotalXP).toBe(100); // Exactly at threshold
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(1);

      testLogger.log('Exact threshold test completed');
    });

    /**
     * Edge Case 2: One XP below threshold (99 XP)
     *
     * Verifies no level-up one XP below threshold
     */
    it('should not level-up at 99 XP (one below threshold)', async () => {
      testLogger.log('Testing one below threshold');

      // Arrange
      const userId = 'almost_levelup_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 96,
        totalXP: 96,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_almost' });

      // Act: Award 3 XP to reach 99 (one below threshold)
      const result = await userLevelService.awardXP(
        userId,
        3,
        'Community comment',
        'community_comment',
        'test'
      );

      // Assert
      expect(result.newTotalXP).toBe(99); // One below threshold
      expect(result.leveledUp).toBe(false); // Should NOT level up
      expect(result.newLevel).toBe(0);

      testLogger.log('One below threshold test completed');
    });

    /**
     * Edge Case 3: Large XP award causing multi-level jump
     *
     * Simulates scenario where community interaction awards massive XP
     * (e.g., bonus event, special achievement)
     */
    it('should handle large community XP award causing level skip', async () => {
      testLogger.log('Testing large community XP award');

      // Arrange
      const userId = 'big_xp_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 50,
        totalXP: 50,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_big' });

      // Act: Award 500 XP (bonus event or special achievement)
      const result = await userLevelService.awardXP(
        userId,
        500,
        'Community special achievement',
        'community_achievement',
        'achievement-special'
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newTotalXP).toBe(550); // 50 + 500
      expect(result.leveledUp).toBe(true);
      expect(result.fromLevel).toBe(0);
      expect(result.newLevel).toBe(2); // Should skip to Level 2 (300 threshold, 550 XP = Level 2)

      testLogger.log('Large XP award test completed', { result });
    });
  });
});
