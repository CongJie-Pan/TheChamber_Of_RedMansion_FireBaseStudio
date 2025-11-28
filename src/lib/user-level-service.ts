/**
 * @fileOverview User Level Service for Gamification System (SQLite-only)
 *
 * SQLITE-025: Refactored to remove ALL Firebase/Firestore dependencies.
 * This service now operates exclusively with SQLite through the user-repository.
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
 * Database Structure (SQLite):
 * - users: User profile records
 * - level_ups: Level-up history records
 * - xp_transactions: XP transaction history
 *
 * Service Design Principles:
 * - Atomic operations for XP updates
 * - Real-time level-up detection
 * - Transaction logging for audit trail
 * - Type-safe operations
 */

// Firebase removed - SQLITE-025 (now using SQLite Timestamp)
import {
  UserProfile,
  UserLevel,
  LevelUpRecord,
  XPTransaction,
  LevelPermission,
  AttributePoints,
  LevelRequirementCheck,
  Timestamp,
} from './types/user-level';
import {
  LEVELS_CONFIG,
  getLevelConfig,
  getAllPermissionsForLevel,
  calculateLevelFromXP,
  calculateXPProgress,
  MAX_LEVEL,
} from './config/levels-config';

// SQLITE-025: SQLite-only imports (server-side only)
// Standard ESM imports - these are resolved at build time by Next.js
// The @libsql/client is excluded from client bundles via next.config.ts serverComponentsExternalPackages
import * as userRepository from './repositories/user-repository';
import { fromUnixTimestamp, toUnixTimestamp, getDatabase } from './sqlite-db';

const SQLITE_FLAG_ENABLED = process.env.USE_SQLITE !== '0' && process.env.USE_SQLITE !== 'false';
const SQLITE_SERVER_ENABLED = typeof window === 'undefined' && SQLITE_FLAG_ENABLED;

// Log initialization status on server-side only
if (typeof window === 'undefined') {
  if (SQLITE_SERVER_ENABLED) {
    console.log('✅ [UserLevelService] SQLite modules loaded successfully');
  } else {
    console.warn('⚠️  [UserLevelService] USE_SQLITE flag disabled; service will not operate.');
  }
}

/**
 * XP reward amounts for different actions
 * Central configuration for XP economy balance
 */
export const XP_REWARDS = {
  // Reading actions
  CHAPTER_COMPLETED: 10,
  FIRST_CHAPTER_COMPLETED: 20,
  NEW_USER_WELCOME_BONUS: 15,      // One-time bonus for new users entering reading page
  READING_TIME_15MIN: 3,           // Re-enabled: Award XP for sustained reading

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

  // AI interactions - Achievement (one-time rewards)
  AI_FIRST_QUESTION_ACHIEVEMENT: 20,  // 心有疑，隨札記 - First AI question asked

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
 * User Level Service Class (SQLite-only)
 * Singleton service for managing user levels and XP
 */
export class UserLevelService {
  /**
   * Initialize a new user profile (SQLite-only)
   * Called automatically when a new user registers
   *
   * @param userId - User ID
   * @param displayName - User's display name
   * @param email - User's email address
   * @returns Promise with the created user profile
   */
  async initializeUserProfile(
    userId: string,
    displayName: string,
    email: string
  ): Promise<UserProfile> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      // Check if profile already exists
      const existingProfile = await this.getUserProfile(userId);
      if (existingProfile) {
        console.log(`User profile already exists for ${userId}`);
        return existingProfile;
      }

      console.log(`🗄️  [UserLevelService] Initializing user profile for ${userId}`);

      const sqliteProfile = userRepository.createUser(userId, displayName, email);

      // Update unlockedContent with level 0 exclusive content
      const updatedProfile = userRepository.updateUser(userId, {
        unlockedContent: LEVELS_CONFIG[0].exclusiveContent,
      });

      // Convert SQLite Date to Timestamp for service return type
      return {
        userId: updatedProfile.userId,
        username: updatedProfile.username,
        email: updatedProfile.email,
        currentLevel: updatedProfile.currentLevel,
        currentXP: updatedProfile.currentXP,
        totalXP: updatedProfile.totalXP,
        nextLevelXP: LEVELS_CONFIG[1].requiredXP,
        completedTasks: updatedProfile.completedTasks,
        unlockedContent: updatedProfile.unlockedContent,
        completedChapters: updatedProfile.completedChapters,
        hasReceivedWelcomeBonus: updatedProfile.hasReceivedWelcomeBonus,
        attributes: updatedProfile.attributes,
        stats: updatedProfile.stats,
        createdAt: fromUnixTimestamp(updatedProfile.createdAt.getTime()) as Timestamp,
        updatedAt: fromUnixTimestamp(updatedProfile.updatedAt.getTime()) as Timestamp,
        lastActivityAt: updatedProfile.lastActivityAt
          ? fromUnixTimestamp(updatedProfile.lastActivityAt.getTime()) as Timestamp
          : fromUnixTimestamp(Date.now()) as Timestamp,
      };
    } catch (error) {
      console.error('Error initializing user profile:', error);
      throw new Error('Failed to initialize user profile. Please try again.');
    }
  }

  /**
   * Get user profile (SQLite-only)
   *
   * @param userId - User ID
   * @returns Promise with user profile or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const sqliteProfile = userRepository.getUserById(userId);

      if (!sqliteProfile) {
        return null;
      }

      // Convert SQLite Date to Timestamp for service return type
      const xpProgress = calculateXPProgress(sqliteProfile.totalXP);
      return {
        userId: sqliteProfile.userId,
        username: sqliteProfile.username,
        email: sqliteProfile.email,
        currentLevel: sqliteProfile.currentLevel,
        currentXP: sqliteProfile.currentXP,
        totalXP: sqliteProfile.totalXP,
        nextLevelXP: xpProgress.nextLevelXP, // Computed field
        completedTasks: sqliteProfile.completedTasks,
        unlockedContent: sqliteProfile.unlockedContent,
        completedChapters: sqliteProfile.completedChapters,
        hasReceivedWelcomeBonus: sqliteProfile.hasReceivedWelcomeBonus,
        attributes: sqliteProfile.attributes,
        stats: sqliteProfile.stats,
        createdAt: fromUnixTimestamp(sqliteProfile.createdAt.getTime()) as Timestamp,
        updatedAt: fromUnixTimestamp(sqliteProfile.updatedAt.getTime()) as Timestamp,
        lastActivityAt: sqliteProfile.lastActivityAt
          ? fromUnixTimestamp(sqliteProfile.lastActivityAt.getTime()) as Timestamp
          : fromUnixTimestamp(Date.now()) as Timestamp,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile. Please try again.');
    }
  }

  /**
   * Check if a reward with the same sourceId has already been granted (SQLite-only)
   * Prevents duplicate XP rewards for the same action
   *
   * This method is now public to support cross-system deduplication checks
   * (e.g., preventing daily tasks from awarding XP for content completed in reading page)
   *
   * @param userId - User ID to check
   * @param sourceId - Source ID to check for duplicates
   * @returns Promise with boolean indicating if duplicate exists
   */
  async checkDuplicateReward(userId: string, sourceId: string): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      return userRepository.hasXPLock(userId, sourceId);
    } catch (error) {
      console.error('Error checking duplicate reward:', error);
      // On error, assume not duplicate to avoid blocking legitimate rewards
      return false;
    }
  }

  /**
   * Award XP to a user and handle level-ups (SQLite-only)
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
    isDuplicate?: boolean;
    fromLevel?: number;
    unlockedContent?: string[];
    unlockedPermissions?: LevelPermission[];
  }> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      // Validate amount (strict checks to prevent NaN corruption)
      if (amount === undefined || amount === null) {
        throw new Error('XP amount cannot be undefined or null');
      }
      if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
        throw new Error(`Invalid XP amount: ${amount}. Must be a finite number.`);
      }
      if (amount < 0) {
        throw new Error('XP amount cannot be negative');
      }

      console.log(`🗄️  [UserLevelService] Awarding XP: ${userId}, amount=${amount}, source=${source}, sourceId=${sourceId || 'none'}`);

      // Call repository's all-in-one atomic function
      const result = userRepository.awardXPWithLevelUp(
        userId,
        amount,
        reason,
        source,
        sourceId || ''
      );

      console.log(`✅ [UserLevelService] XP award complete: ${userId} +${amount}XP ${result.leveledUp ? `(leveled up ${result.fromLevel} → ${result.newLevel})` : ''}`);

      // Convert repository result to service return format
      return {
        success: result.success,
        newTotalXP: result.newTotalXP,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        isDuplicate: result.isDuplicate,
        fromLevel: result.fromLevel,
        unlockedContent: result.unlockedContent as string[] | undefined,
        unlockedPermissions: result.unlockedPermissions as LevelPermission[] | undefined,
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
   * Record a level-up event (SQLite-only)
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
    if (!SQLITE_SERVER_ENABLED) {
      console.warn('[UserLevelService] Cannot record level-up: SQLite only available server-side');
      return '';
    }

    try {
      const levelUpId = userRepository.createLevelUpRecord({
        userId,
        fromLevel,
        toLevel,
        unlockedContent: [], // Not stored in current SQLite schema
        unlockedPermissions: [], // Not stored in current SQLite schema
      });
      console.log(`📝 Level-up recorded: ${userId} (${fromLevel} → ${toLevel})`);
      return levelUpId;
    } catch (error) {
      console.error('Error recording level-up:', error);
      // Don't throw - level-up recording is not critical
      return '';
    }
  }

  /**
   * Log an XP transaction for audit trail (SQLite-only)
   *
   * @param transaction - Transaction data (without id and timestamp)
   * @returns Promise with the transaction ID
   */
  private async logXPTransaction(
    transaction: Omit<XPTransaction, 'id' | 'timestamp'>
  ): Promise<string> {
    if (!SQLITE_SERVER_ENABLED) {
      console.warn('[UserLevelService] Cannot log XP transaction: SQLite only available server-side');
      return '';
    }

    try {
      const transactionId = userRepository.createXPTransaction({
        userId: transaction.userId,
        amount: transaction.amount,
        reason: transaction.reason,
        source: transaction.source,
        sourceId: transaction.sourceId || '',
      });
      return transactionId;
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
   * Update user attribute points (SQLite-only)
   *
   * @param userId - User ID
   * @param attributeUpdates - Partial attribute points to update
   * @returns Promise with success status
   */
  async updateAttributes(
    userId: string,
    attributeUpdates: Partial<AttributePoints>
  ): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const updatedAttributes = {
        ...profile.attributes,
        ...attributeUpdates,
      };

      // Clamp values to 0-100
      Object.keys(updatedAttributes).forEach((key) => {
        const value = updatedAttributes[key as keyof AttributePoints];
        updatedAttributes[key as keyof AttributePoints] = Math.max(0, Math.min(100, value));
      });

      userRepository.updateUser(userId, {
        attributes: updatedAttributes,
      });

      return true;
    } catch (error) {
      console.error('Error updating attributes:', error);
      return false;
    }
  }

  /**
   * Update user statistics (SQLite-only)
   *
   * @param userId - User ID
   * @param statsUpdates - Partial stats to update
   * @returns Promise with success status
   */
  async updateStats(
    userId: string,
    statsUpdates: Partial<UserProfile['stats']>
  ): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      const updatedStats = {
        ...profile.stats,
        ...statsUpdates,
      };

      userRepository.updateUser(userId, {
        stats: updatedStats,
      });

      return true;
    } catch (error) {
      console.error('Error updating stats:', error);
      return false;
    }
  }

  /**
   * Mark a task as completed (SQLite-only)
   *
   * @param userId - User ID
   * @param taskId - Task ID to mark as completed
   * @returns Promise with success status
   */
  async completeTask(userId: string, taskId: string): Promise<boolean> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return false;
      }

      // Check if task already completed
      if (profile.completedTasks.includes(taskId)) {
        return true;
      }

      userRepository.updateUser(userId, {
        completedTasks: [...profile.completedTasks, taskId],
      });

      return true;
    } catch (error) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  /**
   * Get user's level-up history (SQLite-only)
   *
   * @param userId - User ID
   * @param limitCount - Number of records to fetch (default: 10)
   * @returns Promise with array of level-up records
   */
  async getLevelUpHistory(userId: string, limitCount: number = 10): Promise<LevelUpRecord[]> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const sqliteRecords = userRepository.getLevelUpsByUser(userId);

      // Convert to service format and apply limit
      const records: LevelUpRecord[] = sqliteRecords
        .slice(0, limitCount)
        .map((row: any) => ({
          id: row.levelUpId,
          userId: row.userId,
          fromLevel: row.fromLevel,
          toLevel: row.toLevel,
          totalXPAtLevelUp: 0, // Not stored in SQLite schema, default to 0
          timestamp: fromUnixTimestamp(row.createdAt) as Timestamp,
          triggerReason: undefined, // Not stored in SQLite schema
        }));

      return records;
    } catch (error) {
      console.error('Error fetching level-up history:', error);
      return [];
    }
  }

  /**
   * Get user's recent XP transactions (SQLite-only)
   *
   * @param userId - User ID
   * @param limitCount - Number of transactions to fetch (default: 20)
   * @returns Promise with array of XP transactions
   */
  async getXPHistory(userId: string, limitCount: number = 20): Promise<XPTransaction[]> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      const sqliteTransactions = userRepository.getXPTransactionsByUser(userId, limitCount);

      // Convert to service format
      const transactions: XPTransaction[] = sqliteTransactions.map((row: any) => ({
        id: row.transactionId,
        userId: row.userId,
        amount: row.amount,
        reason: row.reason,
        source: row.source as XPTransaction['source'],
        sourceId: row.sourceId,
        timestamp: fromUnixTimestamp(row.createdAt) as Timestamp,
        newTotalXP: 0, // Not stored in SQLite schema
        newLevel: 0, // Not stored in SQLite schema
        causedLevelUp: false, // Not stored in SQLite schema
      }));

      return transactions;
    } catch (error) {
      console.error('Error fetching XP history:', error);
      return [];
    }
  }

  /**
   * Reset all data for a guest user (SQLite-only)
   * (GUEST USERS ONLY)
   *
   * ⚠️ WARNING: This method permanently deletes all user data including:
   * - User profile
   * - Level-up history
   * - XP transaction history
   * - Daily task progress (all dates)
   * - Daily task history
   *
   * This operation is irreversible and should only be used for guest/anonymous users.
   *
   * @param userId - User ID to reset (must be a guest user)
   * @param displayName - Display name for reinitialized profile
   * @param email - Email for reinitialized profile
   * @returns Promise with success status and reinitialized profile
   */
  async resetGuestUserData(
    userId: string,
    displayName: string,
    email: string
  ): Promise<{
    success: boolean;
    message: string;
    profile?: UserProfile;
  }> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      console.log(`🧹 Starting complete data reset for guest user ${userId}...`);

      // Safety check: Verify user profile exists
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return {
          success: false,
          message: 'User profile not found',
        };
      }

      console.log(`🗄️  [UserLevelService] Resetting guest user data`);

      // For SQLite, we need to manually delete from all related tables
      // since we don't have CASCADE DELETE set up everywhere
      const db = getDatabase();

      // Delete in reverse order of dependencies to avoid foreign key errors
      console.log('🗑️ Deleting all user-related data from SQLite...');

      await db.execute({ sql: 'DELETE FROM xp_transaction_locks WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM xp_transactions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM level_ups WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM task_submissions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM daily_progress WHERE userId = ?', args: [userId] });

      // Delete notes if they exist
      try {
        await db.execute({ sql: 'DELETE FROM notes WHERE userId = ?', args: [userId] });
      } catch (e) {
        // Notes table might not exist yet, skip
      }

      // Delete user profile last
      userRepository.deleteUser(userId);

      console.log('✅ All user data deleted from SQLite');

      // Reinitialize user profile
      console.log('🔄 Reinitializing user profile...');
      const newProfile = await this.initializeUserProfile(userId, displayName, email);
      console.log('✅ User profile reinitialized');

      console.log(`🎉 Complete data reset successful for user ${userId}`);

      return {
        success: true,
        message: 'Guest user data has been successfully reset',
        profile: newProfile,
      };
    } catch (error) {
      console.error('❌ Error resetting guest user data:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset guest user data',
      };
    }
  }

  /**
   * Reset all data for any user account (SQLite-only)
   * (ALL USERS - Guest and Regular)
   *
   * ⚠️ WARNING: This method permanently deletes all user data including:
   * - XP transactions and locks
   * - Level-up history
   * - Daily task progress and submissions
   * - Notes and highlights
   * - Community posts and comments
   * - User profile (then reinitialized)
   *
   * This operation is irreversible.
   *
   * @param userId - User ID to reset
   * @param displayName - Display name for reinitialized profile
   * @param email - Email for reinitialized profile
   * @returns Promise with success status and reinitialized profile
   */
  async resetUserAccount(
    userId: string,
    displayName: string,
    email: string
  ): Promise<{
    success: boolean;
    message: string;
    profile?: UserProfile;
  }> {
    if (!SQLITE_SERVER_ENABLED) {
      throw new Error('[UserLevelService] Cannot operate: SQLite only available server-side');
    }

    try {
      console.log(`🧹 Starting complete account reset for user ${userId}...`);

      // Safety check: Verify user profile exists
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return {
          success: false,
          message: 'User profile not found',
        };
      }

      console.log(`🗄️  [UserLevelService] Resetting user account data`);

      // For SQLite, we need to manually delete from all related tables
      const db = getDatabase();

      // Delete in reverse order of dependencies to avoid foreign key errors
      console.log('🗑️ Deleting all user-related data from SQLite...');

      // XP and level related
      await db.execute({ sql: 'DELETE FROM xp_transaction_locks WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM xp_transactions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM level_ups WHERE userId = ?', args: [userId] });

      // Task related
      await db.execute({ sql: 'DELETE FROM task_submissions WHERE userId = ?', args: [userId] });
      await db.execute({ sql: 'DELETE FROM daily_progress WHERE userId = ?', args: [userId] });

      // Notes and highlights
      try {
        await db.execute({ sql: 'DELETE FROM notes WHERE userId = ?', args: [userId] });
      } catch (e) {
        // Notes table might not exist yet, skip
        console.log('⚠️ Notes table not found, skipping...');
      }

      try {
        await db.execute({ sql: 'DELETE FROM highlights WHERE userId = ?', args: [userId] });
      } catch (e) {
        // Highlights table might not exist yet, skip
        console.log('⚠️ Highlights table not found, skipping...');
      }

      // Community related - hard delete posts and comments
      try {
        // Delete comments first (they may reference posts)
        await db.execute({ sql: 'DELETE FROM comments WHERE authorId = ?', args: [userId] });
        console.log('✅ Comments deleted');
      } catch (e) {
        console.log('⚠️ Comments table not found, skipping...');
      }

      try {
        // Delete posts
        await db.execute({ sql: 'DELETE FROM posts WHERE authorId = ?', args: [userId] });
        console.log('✅ Posts deleted');
      } catch (e) {
        console.log('⚠️ Posts table not found, skipping...');
      }

      // Delete user profile last
      userRepository.deleteUser(userId);

      console.log('✅ All user data deleted from SQLite');

      // Reinitialize user profile
      console.log('🔄 Reinitializing user profile...');
      const newProfile = await this.initializeUserProfile(userId, displayName, email);
      console.log('✅ User profile reinitialized');

      console.log(`🎉 Complete account reset successful for user ${userId}`);

      return {
        success: true,
        message: 'Account has been successfully reset to initial state',
        profile: newProfile,
      };
    } catch (error) {
      console.error('❌ Error resetting user account:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset user account',
      };
    }
  }
}

// Export singleton instance
export const userLevelService = new UserLevelService();
