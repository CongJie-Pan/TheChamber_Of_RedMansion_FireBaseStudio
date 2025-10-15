/**
 * @fileOverview User Level Service for Gamification System
 *
 * This service manages all user level and experience point (XP) operations
 * for the Red Mansion Cultivation Path (紅樓修行路) gamification system.
 *
 * Core responsibilities:
 * - User profile initialization and management
 * - XP awarding and level-up detection
 * - Permission checking for feature gating
 * - Level progression tracking and history
 * - Attribute points management
 * - Content unlocking based on user level
 *
 * Database Structure:
 * - users/{userId}: User profile documents
 * - levelUps/{recordId}: Level-up history records
 * - xpTransactions/{transactionId}: XP transaction history
 *
 * Service Design Principles:
 * - Atomic operations for XP updates
 * - Real-time level-up detection
 * - Transaction logging for audit trail
 * - Efficient Firestore queries
 * - Type-safe operations
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  increment,
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  UserLevel,
  LevelUpRecord,
  XPTransaction,
  LevelPermission,
  AttributePoints,
  LevelRequirementCheck,
} from './types/user-level';
import {
  LEVELS_CONFIG,
  getLevelConfig,
  getAllPermissionsForLevel,
  calculateLevelFromXP,
  calculateXPProgress,
  MAX_LEVEL,
} from './config/levels-config';

/**
 * XP reward amounts for different actions
 * Central configuration for XP economy balance
 */
export const XP_REWARDS = {
  // Reading actions
  CHAPTER_COMPLETED: 10,
  READING_TIME_15MIN: 3,
  READING_TIME_30MIN: 5,
  READING_TIME_60MIN: 8,

  // Daily tasks
  DAILY_TASK_SIMPLE: 5,
  DAILY_TASK_MEDIUM: 10,
  DAILY_TASK_COMPLEX: 15,

  // Community actions
  POST_CREATED: 5,
  POST_QUALITY_BONUS: 5,      // For high-quality posts (AI evaluated)
  COMMENT_CREATED: 2,
  COMMENT_HELPFUL: 3,          // When marked as helpful
  LIKE_RECEIVED: 1,

  // AI interactions
  AI_QA_INTERACTION: 2,
  AI_DEEP_ANALYSIS: 5,

  // Notes and annotations
  NOTE_CREATED: 3,
  NOTE_QUALITY_BONUS: 5,       // For well-written notes
  ANNOTATION_PUBLISHED: 10,

  // Achievements
  ACHIEVEMENT_UNLOCKED: 15,
  MILESTONE_REACHED: 20,

  // Poetry and cultural
  POETRY_COMPETITION_PARTICIPATION: 10,
  POETRY_COMPETITION_WIN: 30,
  CULTURAL_QUIZ_PASSED: 15,

  // Social and mentoring
  HELP_NEW_USER: 5,
  MENTOR_SESSION: 10,

  // Special events
  SPECIAL_EVENT_PARTICIPATION: 20,
  SPECIAL_EVENT_COMPLETION: 50,
} as const;

/**
 * Initial attribute points for new users
 */
const INITIAL_ATTRIBUTES: AttributePoints = {
  poetrySkill: 0,
  culturalKnowledge: 0,
  analyticalThinking: 0,
  socialInfluence: 0,
  learningPersistence: 0,
};

/**
 * Initial user statistics for new profiles
 */
const INITIAL_STATS = {
  chaptersCompleted: 0,
  totalReadingTimeMinutes: 0,
  notesCount: 0,
  currentStreak: 0,
  longestStreak: 0,
  aiInteractionsCount: 0,
  communityPostsCount: 0,
  communityLikesReceived: 0,
};

/**
 * User Level Service Class
 * Singleton service for managing user levels and XP
 */
export class UserLevelService {
  private usersCollection = collection(db, 'users');
  private levelUpsCollection = collection(db, 'levelUps');
  private xpTransactionsCollection = collection(db, 'xpTransactions');

  /**
   * Initialize a new user profile in Firestore
   * Called automatically when a new user registers
   *
   * @param userId - Firebase Auth user ID
   * @param displayName - User's display name
   * @param email - User's email address
   * @returns Promise with the created user profile
   */
  async initializeUserProfile(
    userId: string,
    displayName: string,
    email: string
  ): Promise<UserProfile> {
    try {
      // Check if profile already exists
      const existingProfile = await this.getUserProfile(userId);
      if (existingProfile) {
        console.log(`User profile already exists for ${userId}`);
        return existingProfile;
      }

      const now = serverTimestamp();
      const newProfile: Omit<UserProfile, 'uid'> & { uid: string } = {
        uid: userId,
        displayName,
        email,
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
        nextLevelXP: LEVELS_CONFIG[1].requiredXP,
        completedTasks: [],
        unlockedContent: LEVELS_CONFIG[0].exclusiveContent,
        attributes: { ...INITIAL_ATTRIBUTES },
        stats: { ...INITIAL_STATS },
        createdAt: now as Timestamp,
        updatedAt: now as Timestamp,
        lastActivityAt: now as Timestamp,
      };

      // Create user profile document
      await setDoc(doc(this.usersCollection, userId), newProfile);

      console.log(`✅ User profile initialized for ${displayName} (${userId})`);

      // Return profile with actual timestamps
      return {
        ...newProfile,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      };
    } catch (error) {
      console.error('Error initializing user profile:', error);
      throw new Error('Failed to initialize user profile. Please try again.');
    }
  }

  /**
   * Get user profile from Firestore
   *
   * @param userId - Firebase Auth user ID
   * @returns Promise with user profile or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(this.usersCollection, userId));

      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data() as DocumentData;
      return {
        uid: userDoc.id,
        ...data,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
        lastActivityAt: data.lastActivityAt || Timestamp.now(),
      } as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile. Please try again.');
    }
  }

  /**
   * Award XP to a user and handle level-ups
   * This is the core function for the gamification system
   *
   * @param userId - User ID to award XP to
   * @param amount - Amount of XP to award (positive integer)
   * @param reason - Reason for XP award (for logging)
   * @param source - Source type of XP (for categorization)
   * @param sourceId - Optional reference ID to the source action
   * @returns Promise with level-up information (if occurred)
   */
  async awardXP(
    userId: string,
    amount: number,
    reason: string,
    source: XPTransaction['source'],
    sourceId?: string
  ): Promise<{
    success: boolean;
    newTotalXP: number;
    newLevel: number;
    leveledUp: boolean;
    fromLevel?: number;
    unlockedContent?: string[];
    unlockedPermissions?: LevelPermission[];
  }> {
    try {
      // Validate amount
      if (amount < 0) {
        throw new Error('XP amount cannot be negative');
      }

      // Get current user profile
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      // Handle 0 XP award (edge case)
      if (amount === 0) {
        return {
          success: true,
          newTotalXP: profile.totalXP,
          newLevel: profile.currentLevel,
          leveledUp: false,
        };
      }

      // Calculate new XP totals
      const oldTotalXP = profile.totalXP;
      const newTotalXP = oldTotalXP + amount;
      const oldLevel = profile.currentLevel;
      const newLevel = calculateLevelFromXP(newTotalXP);
      const leveledUp = newLevel > oldLevel;

      // Calculate XP progress
      const xpProgress = calculateXPProgress(newTotalXP);

      // Update user profile
      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        totalXP: newTotalXP,
        currentLevel: newLevel,
        currentXP: xpProgress.currentXP,
        nextLevelXP: xpProgress.nextLevelXP,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });

      // Log XP transaction
      await this.logXPTransaction({
        userId,
        amount,
        reason,
        source,
        sourceId,
        newTotalXP,
        newLevel,
        causedLevelUp: leveledUp,
      });

      let unlockedContent: string[] = [];
      let unlockedPermissions: LevelPermission[] = [];

      // Handle level-up
      if (leveledUp) {
        console.log(`🎉 User ${userId} leveled up from ${oldLevel} to ${newLevel}!`);

        // Record level-up
        await this.recordLevelUp(userId, oldLevel, newLevel, newTotalXP, reason);

        // Get newly unlocked content and permissions
        for (let level = oldLevel + 1; level <= newLevel; level++) {
          const levelConfig = getLevelConfig(level);
          if (levelConfig) {
            unlockedContent.push(...levelConfig.exclusiveContent);
            unlockedPermissions.push(...levelConfig.permissions);
          }
        }

        // Update user's unlocked content
        if (unlockedContent.length > 0) {
          const currentContent = profile.unlockedContent || [];
          const updatedContent = Array.from(new Set([...currentContent, ...unlockedContent]));
          await updateDoc(userRef, {
            unlockedContent: updatedContent,
          });
        }
      }

      console.log(`✅ Awarded ${amount} XP to user ${userId}: ${reason}`);

      return {
        success: true,
        newTotalXP,
        newLevel,
        leveledUp,
        ...(leveledUp && {
          fromLevel: oldLevel,
          unlockedContent,
          unlockedPermissions,
        }),
      };
    } catch (error) {
      console.error('Error awarding XP:', error);
      // Re-throw the original error if it's a validation error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to award XP. Please try again.');
    }
  }

  /**
   * Record a level-up event in the levelUps collection
   * Used for analytics and displaying level-up history
   *
   * @param userId - User ID who leveled up
   * @param fromLevel - Previous level
   * @param toLevel - New level
   * @param totalXP - Total XP at time of level-up
   * @param triggerReason - What caused the level-up
   * @returns Promise with the record ID
   */
  private async recordLevelUp(
    userId: string,
    fromLevel: number,
    toLevel: number,
    totalXP: number,
    triggerReason?: string
  ): Promise<string> {
    try {
      const record: Omit<LevelUpRecord, 'id'> = {
        userId,
        fromLevel,
        toLevel,
        totalXPAtLevelUp: totalXP,
        timestamp: serverTimestamp() as Timestamp,
        triggerReason,
      };

      const docRef = await addDoc(this.levelUpsCollection, record);
      console.log(`📝 Level-up recorded: ${userId} (${fromLevel} → ${toLevel})`);
      return docRef.id;
    } catch (error) {
      console.error('Error recording level-up:', error);
      // Don't throw - level-up recording is not critical
      return '';
    }
  }

  /**
   * Log an XP transaction for audit trail
   *
   * @param transaction - Transaction data (without id and timestamp)
   * @returns Promise with the transaction ID
   */
  private async logXPTransaction(
    transaction: Omit<XPTransaction, 'id' | 'timestamp'>
  ): Promise<string> {
    try {
      const record: Omit<XPTransaction, 'id'> = {
        ...transaction,
        timestamp: serverTimestamp() as Timestamp,
      };

      const docRef = await addDoc(this.xpTransactionsCollection, record);
      return docRef.id;
    } catch (error) {
      console.error('Error logging XP transaction:', error);
      // Don't throw - transaction logging is not critical
      return '';
    }
  }

  /**
   * Get user's current level configuration
   *
   * @param userId - User ID
   * @returns Promise with current level config or null
   */
  async getUserLevel(userId: string): Promise<UserLevel | null> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return null;
      }

      return getLevelConfig(profile.currentLevel);
    } catch (error) {
      console.error('Error getting user level:', error);
      return null;
    }
  }

  /**
   * Get requirements for the next level
   *
   * @param currentLevel - Current level (0-7)
   * @returns Next level config or null if max level
   */
  getNextLevelRequirements(currentLevel: number): UserLevel | null {
    if (currentLevel >= MAX_LEVEL) {
      return null; // Already at max level
    }

    return getLevelConfig(currentLevel + 1);
  }

  /**
   * Check if user has a specific permission
   *
   * @param userId - User ID
   * @param permission - Permission to check
   * @returns Promise with boolean indicating if user has permission
   */
  async checkPermission(userId: string, permission: LevelPermission): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const userPermissions = getAllPermissionsForLevel(profile.currentLevel);
      return userPermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Synchronously check if a level has a specific permission
   * Used for client-side permission gating when user level is already known
   *
   * @param userLevel - User's current level
   * @param permission - Permission to check
   * @returns Boolean indicating if level has permission
   */
  checkPermissionSync(userLevel: number, permission: LevelPermission): boolean {
    const userPermissions = getAllPermissionsForLevel(userLevel);
    return userPermissions.includes(permission);
  }

  /**
   * Check multiple permissions at once
   *
   * @param userId - User ID
   * @param permissions - Array of permissions to check
   * @returns Promise with object mapping permission to boolean
   */
  async checkPermissions(
    userId: string,
    permissions: LevelPermission[]
  ): Promise<Record<LevelPermission, boolean>> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return permissions.reduce((acc, p) => ({ ...acc, [p]: false }), {} as Record<LevelPermission, boolean>);
      }

      const userPermissions = getAllPermissionsForLevel(profile.currentLevel);
      return permissions.reduce(
        (acc, p) => ({ ...acc, [p]: userPermissions.includes(p) }),
        {} as Record<LevelPermission, boolean>
      );
    } catch (error) {
      console.error('Error checking permissions:', error);
      return permissions.reduce((acc, p) => ({ ...acc, [p]: false }), {} as Record<LevelPermission, boolean>);
    }
  }

  /**
   * Get unlocked content IDs for a user
   *
   * @param userId - User ID
   * @returns Promise with array of unlocked content IDs
   */
  async getUnlockedContent(userId: string): Promise<string[]> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return [];
      }

      return profile.unlockedContent || [];
    } catch (error) {
      console.error('Error getting unlocked content:', error);
      return [];
    }
  }

  /**
   * Check if user meets requirements for next level
   *
   * @param userId - User ID
   * @returns Promise with requirement check result
   */
  async checkLevelRequirements(userId: string): Promise<LevelRequirementCheck> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return {
          canLevelUp: false,
          xpRequirementMet: false,
          xpNeeded: 0,
        };
      }

      const nextLevel = this.getNextLevelRequirements(profile.currentLevel);
      if (!nextLevel) {
        // Already at max level
        return {
          canLevelUp: false,
          xpRequirementMet: true,
          xpNeeded: 0,
        };
      }

      const xpNeeded = Math.max(0, nextLevel.requiredXP - profile.totalXP);
      const xpRequirementMet = xpNeeded === 0;

      // Check special requirements if any
      const specialRequirements = nextLevel.specialRequirements?.map((req) => {
        // Simplified check - in real implementation, would check actual progress
        return {
          type: req.type,
          description: req.description,
          completed: false, // TODO: Implement actual requirement checking
          progress: 0,
          target: typeof req.target === 'number' ? req.target : 0,
        };
      });

      const allSpecialRequirementsMet = specialRequirements?.every((r) => r.completed) ?? true;

      return {
        canLevelUp: xpRequirementMet && allSpecialRequirementsMet,
        xpRequirementMet,
        xpNeeded,
        specialRequirements,
      };
    } catch (error) {
      console.error('Error checking level requirements:', error);
      return {
        canLevelUp: false,
        xpRequirementMet: false,
        xpNeeded: 0,
      };
    }
  }

  /**
   * Update user attribute points
   *
   * @param userId - User ID
   * @param attributeUpdates - Partial attribute points to update
   * @returns Promise with success status
   */
  async updateAttributes(
    userId: string,
    attributeUpdates: Partial<AttributePoints>
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const userRef = doc(this.usersCollection, userId);
      const updatedAttributes = {
        ...profile.attributes,
        ...attributeUpdates,
      };

      // Clamp values to 0-100
      Object.keys(updatedAttributes).forEach((key) => {
        const value = updatedAttributes[key as keyof AttributePoints];
        updatedAttributes[key as keyof AttributePoints] = Math.max(0, Math.min(100, value));
      });

      await updateDoc(userRef, {
        attributes: updatedAttributes,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error updating attributes:', error);
      return false;
    }
  }

  /**
   * Update user statistics
   *
   * @param userId - User ID
   * @param statsUpdates - Partial stats to update
   * @returns Promise with success status
   */
  async updateStats(
    userId: string,
    statsUpdates: Partial<UserProfile['stats']>
  ): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const userRef = doc(this.usersCollection, userId);
      const updatedStats = {
        ...profile.stats,
        ...statsUpdates,
      };

      await updateDoc(userRef, {
        stats: updatedStats,
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error updating stats:', error);
      return false;
    }
  }

  /**
   * Mark a task as completed
   *
   * @param userId - User ID
   * @param taskId - Task ID to mark as completed
   * @returns Promise with success status
   */
  async completeTask(userId: string, taskId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      // Check if task already completed
      if (profile.completedTasks.includes(taskId)) {
        return true;
      }

      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        completedTasks: [...profile.completedTasks, taskId],
        updatedAt: serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  /**
   * Get user's level-up history
   *
   * @param userId - User ID
   * @param limitCount - Number of records to fetch (default: 10)
   * @returns Promise with array of level-up records
   */
  async getLevelUpHistory(userId: string, limitCount: number = 10): Promise<LevelUpRecord[]> {
    try {
      const levelUpsQuery = query(
        this.levelUpsCollection,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(levelUpsQuery);
      const records: LevelUpRecord[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || Timestamp.now(),
        } as LevelUpRecord);
      });

      return records;
    } catch (error) {
      console.error('Error fetching level-up history:', error);
      return [];
    }
  }

  /**
   * Get user's recent XP transactions
   *
   * @param userId - User ID
   * @param limitCount - Number of transactions to fetch (default: 20)
   * @returns Promise with array of XP transactions
   */
  async getXPHistory(userId: string, limitCount: number = 20): Promise<XPTransaction[]> {
    try {
      const xpQuery = query(
        this.xpTransactionsCollection,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(xpQuery);
      const transactions: XPTransaction[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || Timestamp.now(),
        } as XPTransaction);
      });

      return transactions;
    } catch (error) {
      console.error('Error fetching XP history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userLevelService = new UserLevelService();
