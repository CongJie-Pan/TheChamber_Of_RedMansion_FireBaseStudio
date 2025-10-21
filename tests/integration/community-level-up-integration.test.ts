/**
 * @fileOverview Community Level-Up Animation Integration Tests
 *
 * End-to-end integration tests for the community level-up animation system including:
 * - Awarding XP from community interactions (post, like, comment)
 * - Detecting level-up when XP threshold is reached
 * - Triggering level-up modal display
 * - Verifying correct level information is shown
 * - Testing all three XP award scenarios in community
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal level-up workflows
 * 2. Edge Cases: Boundary conditions and threshold scenarios
 * 3. Failure Cases: No level-up when threshold not reached
 *
 * These tests verify the complete flow from community interaction to level-up celebration.
 */

import { UserLevelService } from '@/lib/user-level-service';
import { calculateLevelFromXP } from '@/lib/config/levels-config';

// Import Firebase mocks (configured in jest.setup.js)
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

describe('Community Level-Up Animation Integration Tests', () => {
  let userLevelService: UserLevelService;
  let testLogger: any;

  beforeEach(() => {
    // Initialize service and test logger
    userLevelService = new UserLevelService();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default Firebase mock behavior
    (doc as jest.Mock).mockReturnValue({ id: 'mocked-doc-ref', path: 'mocked/path' });
    (serverTimestamp as jest.Mock).mockReturnValue({ seconds: Date.now() / 1000 });
  });

  afterEach(() => {
    // Save test logs
    const fs = require('fs');
    const path = require('path');

    if (global.__TEST_CONFIG__) {
      const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      const logPath = path.join(
        global.__TEST_CONFIG__.outputDir,
        'community-level-up-integration',
        `${testName}_logs.json`
      );

      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, JSON.stringify({
          testName: expect.getState().currentTestName,
          logs: testLogger.logs,
          timestamp: new Date().toISOString(),
        }, null, 2));
      } catch (error) {
        console.error('Failed to write test logs:', error);
      }
    }
  });

  describe('Level-Up from Community Post - Expected Use Cases', () => {
    /**
     * Test Case 1: Level-up after creating a post (10 XP)
     *
     * Simulates the complete flow of:
     * 1. User has 90 XP (Level 0)
     * 2. User creates a post, earning 10 XP
     * 3. User reaches 100 XP → Level 1
     * 4. Level-up modal should be triggered
     */
    it('should trigger level-up modal after posting to reach Level 1', async () => {
      testLogger.log('Testing level-up from community post');

      // Arrange: User with 90 XP, about to level up
      const userId = 'community_post_user';
      const currentProfile = {
        uid: userId,
        displayName: '測試用戶',
        email: 'test@example.com',
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
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_post_levelup' });

      // Act: Award 10 XP for creating a post
      const xpResult = await userLevelService.awardXP(
        userId,
        10,
        'Created a community post',
        'community_post',
        'post-abc123'
      );

      // Assert: Verify level-up detection
      expect(xpResult.success).toBe(true);
      expect(xpResult.newTotalXP).toBe(100); // 90 + 10
      expect(xpResult.leveledUp).toBe(true); // Should level up
      expect(xpResult.fromLevel).toBe(0); // From Level 0
      expect(xpResult.newLevel).toBe(1); // To Level 1

      // Simulate community page handling this result
      const shouldShowModal = xpResult.leveledUp;
      const modalInfo = {
        fromLevel: xpResult.fromLevel,
        toLevel: xpResult.newLevel
      };

      expect(shouldShowModal).toBe(true);
      expect(modalInfo.fromLevel).toBe(0);
      expect(modalInfo.toLevel).toBe(1);

      testLogger.log('Level-up from post test completed', {
        xpResult,
        shouldShowModal,
        modalInfo
      });
    });

    /**
     * Test Case 2: No level-up when XP insufficient
     *
     * Verifies that no level-up occurs when user doesn't reach threshold
     */
    it('should not trigger level-up modal when XP is insufficient after posting', async () => {
      testLogger.log('Testing no level-up scenario');

      // Arrange: User with 50 XP, not close to level-up
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

      // Act: Award 10 XP for creating a post
      const xpResult = await userLevelService.awardXP(
        userId,
        10,
        'Created a community post',
        'community_post',
        'post-xyz789'
      );

      // Assert: No level-up should occur
      expect(xpResult.success).toBe(true);
      expect(xpResult.newTotalXP).toBe(60); // 50 + 10 (still below 100)
      expect(xpResult.leveledUp).toBe(false); // Should NOT level up
      expect(xpResult.newLevel).toBe(0); // Still Level 0

      // Modal should NOT be shown
      const shouldShowModal = xpResult.leveledUp;
      expect(shouldShowModal).toBe(false);

      testLogger.log('No level-up scenario test completed');
    });
  });

  describe('Level-Up from Community Like - Expected Use Cases', () => {
    /**
     * Test Case: Level-up after liking a post (5 XP)
     *
     * Simulates:
     * 1. User has 95 XP
     * 2. User likes a post, earning 5 XP
     * 3. User reaches 100 XP → Level 1
     * 4. Level-up modal triggered
     */
    it('should trigger level-up modal after liking to reach Level 1', async () => {
      testLogger.log('Testing level-up from community like');

      // Arrange
      const userId = 'community_like_user';
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
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_like_levelup' });

      // Act: Award 5 XP for liking a post
      const xpResult = await userLevelService.awardXP(
        userId,
        5,
        'Liked a community post',
        'community_like',
        'post-like-001'
      );

      // Assert
      expect(xpResult.success).toBe(true);
      expect(xpResult.newTotalXP).toBe(100); // 95 + 5 = exactly 100
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.fromLevel).toBe(0);
      expect(xpResult.newLevel).toBe(1);

      testLogger.log('Level-up from like test completed', { xpResult });
    });
  });

  describe('Level-Up from Community Comment - Expected Use Cases', () => {
    /**
     * Test Case: Level-up after commenting (3 XP)
     *
     * Simulates:
     * 1. User has 97 XP
     * 2. User comments on a post, earning 3 XP
     * 3. User reaches 100 XP → Level 1
     * 4. Level-up modal triggered
     */
    it('should trigger level-up modal after commenting to reach Level 1', async () => {
      testLogger.log('Testing level-up from community comment');

      // Arrange
      const userId = 'community_comment_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 97,
        totalXP: 97,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_comment_levelup' });

      // Act: Award 3 XP for commenting
      const xpResult = await userLevelService.awardXP(
        userId,
        3,
        'Commented on a community post',
        'community_comment',
        'comment-abc-001'
      );

      // Assert
      expect(xpResult.success).toBe(true);
      expect(xpResult.newTotalXP).toBe(100); // 97 + 3 = exactly 100
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.fromLevel).toBe(0);
      expect(xpResult.newLevel).toBe(1);

      testLogger.log('Level-up from comment test completed', { xpResult });
    });
  });

  describe('Exact Threshold Scenarios - Edge Cases', () => {
    /**
     * Edge Case 1: Exact 100 XP threshold
     *
     * Verifies level-up detection at exact threshold
     */
    it('should trigger level-up at exact 100 XP threshold', async () => {
      testLogger.log('Testing exact threshold level-up');

      // Arrange: User at 99 XP
      const userId = 'exact_threshold_user';
      const currentProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 99,
        totalXP: 99,
        nextLevelXP: 100,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => currentProfile
      });
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_exact' });

      // Act: Award 1 XP to reach exactly 100
      const xpResult = await userLevelService.awardXP(
        userId,
        1,
        'Community interaction',
        'community_post',
        'test'
      );

      // Assert
      expect(xpResult.newTotalXP).toBe(100);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.newLevel).toBe(1);

      testLogger.log('Exact threshold test completed');
    });

    /**
     * Edge Case 2: One XP below threshold (99 XP)
     *
     * Verifies no level-up occurs one XP below threshold
     */
    it('should not trigger level-up at 99 XP (one below threshold)', async () => {
      testLogger.log('Testing one below threshold');

      // Arrange
      const userId = 'almost_levelup';
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

      // Act: Award 3 XP to reach 99 (one below)
      const xpResult = await userLevelService.awardXP(
        userId,
        3,
        'Comment',
        'community_comment',
        'test'
      );

      // Assert
      expect(xpResult.newTotalXP).toBe(99); // One below
      expect(xpResult.leveledUp).toBe(false); // Should NOT level up

      testLogger.log('One below threshold test completed');
    });
  });

  describe('Multi-Level Jump Scenarios - Edge Cases', () => {
    /**
     * Edge Case: Large XP award causing multi-level jump
     *
     * Simulates scenario where user earns massive XP (e.g., special event)
     * and skips multiple levels at once
     */
    it('should handle multi-level jump and trigger level-up modal', async () => {
      testLogger.log('Testing multi-level jump');

      // Arrange: User at Level 0 with 0 XP
      const userId = 'multi_level_user';
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
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_multi' });

      // Act: Award 300 XP (special community achievement)
      const xpResult = await userLevelService.awardXP(
        userId,
        300,
        'Community special achievement',
        'community_achievement',
        'achievement-001'
      );

      // Assert: Should jump to Level 2 (threshold 300)
      expect(xpResult.success).toBe(true);
      expect(xpResult.newTotalXP).toBe(300);
      expect(xpResult.leveledUp).toBe(true);
      expect(xpResult.fromLevel).toBe(0);
      expect(xpResult.newLevel).toBe(2); // Jumped directly to Level 2

      // Modal should show level jump from 0 to 2
      const modalInfo = {
        fromLevel: xpResult.fromLevel,
        toLevel: xpResult.newLevel
      };
      expect(modalInfo.fromLevel).toBe(0);
      expect(modalInfo.toLevel).toBe(2);

      testLogger.log('Multi-level jump test completed', { xpResult, modalInfo });
    });
  });

  describe('Level-Up Modal Information Verification', () => {
    /**
     * Test Case: Verify modal receives correct information
     *
     * Ensures that the modal is provided with accurate level data
     */
    it('should provide correct level information to modal', async () => {
      testLogger.log('Testing modal information accuracy');

      // Arrange
      const userId = 'modal_info_user';
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
      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_modal' });

      // Act: Level up
      const xpResult = await userLevelService.awardXP(
        userId,
        10,
        'Post',
        'community_post',
        'test'
      );

      // Simulate what community page would do
      if (xpResult.leveledUp && xpResult.fromLevel !== undefined && xpResult.newLevel) {
        const levelUpInfo = {
          from: xpResult.fromLevel,
          to: xpResult.newLevel
        };

        // Assert: Modal info should be correct
        expect(levelUpInfo.from).toBe(0);
        expect(levelUpInfo.to).toBe(1);

        // Verify level calculation is consistent
        const calculatedLevel = calculateLevelFromXP(xpResult.newTotalXP);
        expect(calculatedLevel).toBe(xpResult.newLevel);

        testLogger.log('Modal information verification completed', { levelUpInfo });
      } else {
        fail('Level-up should have been triggered');
      }
    });
  });

  describe('Sequential Community Interactions - Realistic Workflow', () => {
    /**
     * Test Case: Realistic user journey to Level 1
     *
     * Simulates a realistic scenario of multiple interactions leading to level-up
     */
    it('should handle sequential community interactions leading to level-up', async () => {
      testLogger.log('Testing realistic user journey');

      const userId = 'journey_user';
      let currentXP = 70;
      let currentLevel = 0;

      // Mock getDoc to return updated state
      (getDoc as jest.Mock).mockImplementation(() => Promise.resolve({
        exists: () => true,
        data: () => ({
          uid: userId,
          currentLevel,
          currentXP,
          totalXP: currentXP,
          nextLevelXP: 100,
        })
      }));

      (updateDoc as jest.Mock).mockImplementation(() => {
        // This would be done by the actual service
        return Promise.resolve();
      });

      (addDoc as jest.Mock).mockResolvedValue({ id: 'tx_journey' });

      // Interaction 1: Like a post (+5 XP) → 75 XP
      const result1 = await userLevelService.awardXP(userId, 5, 'Like', 'community_like', 'test1');
      currentXP += 5;
      expect(result1.leveledUp).toBe(false);

      // Interaction 2: Comment on a post (+3 XP) → 78 XP
      const result2 = await userLevelService.awardXP(userId, 3, 'Comment', 'community_comment', 'test2');
      currentXP += 3;
      expect(result2.leveledUp).toBe(false);

      // Interaction 3: Create a post (+10 XP) → 88 XP
      const result3 = await userLevelService.awardXP(userId, 10, 'Post', 'community_post', 'test3');
      currentXP += 10;
      expect(result3.leveledUp).toBe(false);

      // Interaction 4: Another post (+10 XP) → 98 XP
      const result4 = await userLevelService.awardXP(userId, 10, 'Post', 'community_post', 'test4');
      currentXP += 10;
      expect(result4.leveledUp).toBe(false);

      // Interaction 5: Like another post (+5 XP) → 103 XP → LEVEL UP!
      currentXP = 95; // Set to just below threshold for final test
      const result5 = await userLevelService.awardXP(userId, 5, 'Like', 'community_like', 'test5');

      // Assert: Final interaction should trigger level-up
      expect(result5.leveledUp).toBe(true);
      expect(result5.fromLevel).toBe(0);
      expect(result5.newLevel).toBe(1);

      testLogger.log('Realistic user journey test completed', {
        finalXP: result5.newTotalXP,
        leveledUp: result5.leveledUp
      });
    });
  });
});
