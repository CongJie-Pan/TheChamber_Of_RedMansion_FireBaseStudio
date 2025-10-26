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
  deleteDoc,
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
import { runTransaction } from 'firebase/firestore';

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
        completedChapters: [], // Initialize empty array for tracking completed chapters
        hasReceivedWelcomeBonus: false, // User has not received welcome bonus yet
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

      // Sanitize corrupted NaN values (auto-repair corrupted profiles)
      let needsRepair = false;
      let sanitizedData = { ...data };

      // Check for NaN corruption in XP fields
      if (isNaN(data.totalXP) || data.totalXP === undefined || data.totalXP === null) {
        console.warn(`⚠️ Corrupted totalXP detected for user ${userDoc.id}, repairing...`);
        sanitizedData.totalXP = 0;
        needsRepair = true;
      }

      if (isNaN(data.currentLevel) || data.currentLevel === undefined || data.currentLevel === null) {
        console.warn(`⚠️ Corrupted currentLevel detected for user ${userDoc.id}, repairing...`);
        sanitizedData.currentLevel = 0;
        needsRepair = true;
      }

      // Recalculate XP progress if any corruption detected
      if (needsRepair || isNaN(data.currentXP) || isNaN(data.nextLevelXP)) {
        const xpProgress = calculateXPProgress(sanitizedData.totalXP);
        sanitizedData.currentXP = xpProgress.currentXP;
        sanitizedData.nextLevelXP = xpProgress.nextLevelXP;
        sanitizedData.currentLevel = xpProgress.currentLevel;

        // Persist the repair to Firebase
        console.log(`🔧 Repairing user profile for ${userDoc.id}...`);
        await updateDoc(doc(this.usersCollection, userDoc.id), {
          totalXP: sanitizedData.totalXP,
          currentXP: sanitizedData.currentXP,
          nextLevelXP: sanitizedData.nextLevelXP,
          currentLevel: sanitizedData.currentLevel,
          updatedAt: serverTimestamp(),
        });
        console.log(`✅ User profile repaired successfully`);
      }

      return {
        uid: userDoc.id,
        ...sanitizedData,
        completedChapters: data.completedChapters || [], // Backward compatibility: default to empty array
        hasReceivedWelcomeBonus: data.hasReceivedWelcomeBonus !== undefined ? data.hasReceivedWelcomeBonus : false, // Backward compatibility: default to false
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
   * Check if a reward with the same sourceId has already been granted
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
    try {
      const xpQuery = query(
        this.xpTransactionsCollection,
        where('userId', '==', userId),
        where('sourceId', '==', sourceId),
        limit(1)
      );

      const snapshot = await getDocs(xpQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking duplicate reward:', error);
      // On error, assume not duplicate to avoid blocking legitimate rewards
      return false;
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
    isDuplicate?: boolean;
    fromLevel?: number;
    unlockedContent?: string[];
    unlockedPermissions?: LevelPermission[];
  }> {
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
      
      // If sourceId is provided, perform atomic idempotent award via transaction
      if (sourceId) {
        const userRef = doc(this.usersCollection, userId);
        const lockRef = doc(collection(db, 'xpTransactionLocks'), `${userId}__${sourceId}`);

        let txResult: {
          success: boolean;
          newTotalXP: number;
          newLevel: number;
          leveledUp: boolean;
          isDuplicate?: boolean;
          fromLevel?: number;
          unlockedContent?: string[];
          unlockedPermissions?: LevelPermission[];
        } = {
          success: false,
          newTotalXP: 0,
          newLevel: 0,
          leveledUp: false,
        };

        await runTransaction(db, async (transaction) => {
          // Check lock to ensure idempotency
          const lockDoc = await transaction.get(lockRef as any);
          if (lockDoc.exists()) {
            // Already processed
            const existingProfileSnap = await transaction.get(userRef as any);
            const existingProfile = existingProfileSnap.data() as any;
            txResult = {
              success: true,
              newTotalXP: existingProfile?.totalXP ?? 0,
              newLevel: existingProfile?.currentLevel ?? 0,
              leveledUp: false,
              isDuplicate: true,
            };
            return;
          }

          // Load current profile inside transaction
          const userSnap = await transaction.get(userRef as any);
          if (!userSnap.exists()) {
            throw new Error('User profile not found');
          }
          const profile = userSnap.data() as any;

          // Additional guard: if sourceId encodes a chapter (chapter-<n>), prevent duplicates based on profile
          const chapterMatch = sourceId.match(/^chapter-(\d+)$/);
          if (chapterMatch) {
            const chapterId = parseInt(chapterMatch[1], 10);
            const completedChapters: number[] = Array.isArray(profile.completedChapters) ? profile.completedChapters : [];
            if (completedChapters.includes(chapterId)) {
              txResult = {
                success: true,
                newTotalXP: profile.totalXP,
                newLevel: profile.currentLevel,
                leveledUp: false,
                isDuplicate: true,
              };
              return;
            }
          }

          // Handle 0 XP awards
          if (amount === 0) {
            txResult = {
              success: true,
              newTotalXP: profile.totalXP,
              newLevel: profile.currentLevel,
              leveledUp: false,
            };
            // Create lock so we don't process again even for 0 XP
            transaction.set(lockRef as any, {
              userId,
              sourceId,
              createdAt: serverTimestamp(),
              reason,
              source,
              amount,
            });
            return;
          }

          // Compute new totals
          const oldTotalXP = profile.totalXP || 0;
          const newTotalXP = oldTotalXP + amount;
          const oldLevel = profile.currentLevel || 0;
          const newLevel = calculateLevelFromXP(newTotalXP);
          const leveledUp = newLevel > oldLevel;
          const xpProgress = calculateXPProgress(newTotalXP);

          const updateData: any = {
            totalXP: newTotalXP,
            currentLevel: newLevel,
            currentXP: xpProgress.currentXP,
            nextLevelXP: xpProgress.nextLevelXP,
            updatedAt: serverTimestamp(),
            lastActivityAt: serverTimestamp(),
          };

          // Persist completed chapter if applicable (sourceId pattern)
          const chapterMatch2 = sourceId.match(/^chapter-(\d+)$/);
          if (chapterMatch2) {
            const chapterId = parseInt(chapterMatch2[1], 10);
            const currentCompleted: number[] = Array.isArray(profile.completedChapters) ? profile.completedChapters : [];
            updateData.completedChapters = Array.from(new Set([...(currentCompleted || []), chapterId]));
          }

          // Apply profile update
          transaction.update(userRef as any, updateData);

          // Create lock doc to mark processed
          transaction.set(lockRef as any, {
            userId,
            sourceId,
            createdAt: serverTimestamp(),
            reason,
            source,
            amount,
          });

          // Prepare result to return
          txResult = {
            success: true,
            newTotalXP,
            newLevel,
            leveledUp,
          };
        });

        // If duplicate, return early
        if (txResult?.isDuplicate) {
          return txResult;
        }

        if (!txResult) {
          // Should not happen, but guard for types
          const profile = await this.getUserProfile(userId);
          return {
            success: true,
            newTotalXP: profile?.totalXP ?? 0,
            newLevel: profile?.currentLevel ?? 0,
            leveledUp: false,
          };
        }

        // Log XP transaction (outside transaction; safe after lock)
        await this.logXPTransaction({
          userId,
          amount,
          reason,
          source,
          sourceId,
          newTotalXP: txResult.newTotalXP,
          newLevel: txResult.newLevel,
          causedLevelUp: txResult.leveledUp,
        });

        // Handle level-up side effects (record + unlock content)
        let unlockedContent: string[] = [];
        let unlockedPermissions: LevelPermission[] = [];
        if (txResult.leveledUp) {
          const profile = await this.getUserProfile(userId);
          const fromLevel = profile?.currentLevel ? Math.min(profile.currentLevel - 1, txResult.newLevel - 1) : txResult.newLevel - 1;
          await this.recordLevelUp(userId, fromLevel, txResult.newLevel, txResult.newTotalXP, reason);

          for (let level = fromLevel + 1; level <= txResult.newLevel; level++) {
            const levelConfig = getLevelConfig(level);
            if (levelConfig) {
              unlockedContent.push(...levelConfig.exclusiveContent);
              unlockedPermissions.push(...levelConfig.permissions);
            }
          }

          // Merge unlocked content
          if (unlockedContent.length > 0) {
            const userRef2 = doc(this.usersCollection, userId);
            const fresh = await this.getUserProfile(userId);
            const currentContent = fresh?.unlockedContent || [];
            const updatedContent = Array.from(new Set([...currentContent, ...unlockedContent]));
            await updateDoc(userRef2, { unlockedContent: updatedContent });
          }
        }

        console.log(`✅ Awarded ${amount} XP to user ${userId}: ${reason}`);
        return {
          ...txResult,
          ...(txResult.leveledUp && {
            fromLevel: txResult.newLevel - 1,
            unlockedContent,
            unlockedPermissions,
          }),
        };
      }

      // Fallback path for awards without sourceId (non-idempotent)
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

      const oldTotalXP = profile.totalXP;
      const newTotalXP = oldTotalXP + amount;
      const oldLevel = profile.currentLevel;
      const newLevel = calculateLevelFromXP(newTotalXP);
      const leveledUp = newLevel > oldLevel;
      const xpProgress = calculateXPProgress(newTotalXP);

      const userRef = doc(this.usersCollection, userId);
      await updateDoc(userRef, {
        totalXP: newTotalXP,
        currentLevel: newLevel,
        currentXP: xpProgress.currentXP,
        nextLevelXP: xpProgress.nextLevelXP,
        updatedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
      });

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
      if (leveledUp) {
        await this.recordLevelUp(userId, oldLevel, newLevel, newTotalXP, reason);
        for (let level = oldLevel + 1; level <= newLevel; level++) {
          const levelConfig = getLevelConfig(level);
          if (levelConfig) {
            unlockedContent.push(...levelConfig.exclusiveContent);
            unlockedPermissions.push(...levelConfig.permissions);
          }
        }
        if (unlockedContent.length > 0) {
          const currentContent = profile.unlockedContent || [];
          const updatedContent = Array.from(new Set([...currentContent, ...unlockedContent]));
          await updateDoc(userRef, { unlockedContent: updatedContent });
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

  /**
   * Reset all data for a guest user (GUEST USERS ONLY)
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

      // Step 1: Delete all level-up records
      console.log('🗑️ Deleting level-up records...');
      const levelUpsQuery = query(
        this.levelUpsCollection,
        where('userId', '==', userId)
      );
      const levelUpsSnapshot = await getDocs(levelUpsQuery);
      const levelUpDeletions = levelUpsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(levelUpDeletions);
      console.log(`✅ Deleted ${levelUpsSnapshot.size} level-up records`);

      // Step 2: Delete all XP transaction records
      console.log('🗑️ Deleting XP transaction records...');
      const xpQuery = query(
        this.xpTransactionsCollection,
        where('userId', '==', userId)
      );
      const xpSnapshot = await getDocs(xpQuery);
      const xpDeletions = xpSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(xpDeletions);
      console.log(`✅ Deleted ${xpSnapshot.size} XP transaction records`);

      // Step 2.5: Delete all XP transaction locks (idempotency locks)
      // These locks prevent re-awarding one-time achievements (e.g., chapter-1, first AI question)
      // After a full reset, user should be treated as new, so we must clear related locks.
      console.log('🗑️ Deleting XP transaction locks...');
      const xpLocksCollection = collection(db, 'xpTransactionLocks');
      const locksQuery = query(
        xpLocksCollection,
        where('userId', '==', userId)
      );
      const locksSnapshot = await getDocs(locksQuery);
      const lockDeletions = locksSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(lockDeletions);
      console.log(`✅ Deleted ${locksSnapshot.size} XP transaction locks`);

      // Step 2.6: Delete all user notes
      console.log('🗑️ Deleting user notes...');
      const notesCollection = collection(db, 'notes');
      const notesQuery = query(
        notesCollection,
        where('userId', '==', userId)
      );
      const notesSnapshot = await getDocs(notesQuery);
      const noteDeletions = notesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(noteDeletions);
      console.log(`✅ Deleted ${notesSnapshot.size} user notes`);

      // Step 3: Delete all daily task progress records
      console.log('🗑️ Deleting daily task progress records...');
      const dailyTaskProgressCollection = collection(db, 'dailyTaskProgress');
      const progressQuery = query(
        dailyTaskProgressCollection,
        where('userId', '==', userId)
      );
      const progressSnapshot = await getDocs(progressQuery);
      const progressDeletions = progressSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(progressDeletions);
      console.log(`✅ Deleted ${progressSnapshot.size} daily task progress records`);

      // Step 4: Delete all daily task history records
      console.log('🗑️ Deleting daily task history records...');
      const dailyTaskHistoryCollection = collection(db, 'dailyTaskHistory');
      const historyQuery = query(
        dailyTaskHistoryCollection,
        where('userId', '==', userId)
      );
      const historySnapshot = await getDocs(historyQuery);
      const historyDeletions = historySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(historyDeletions);
      console.log(`✅ Deleted ${historySnapshot.size} daily task history records`);

      // Step 5: Delete the user profile document
      console.log('🗑️ Deleting user profile...');
      await deleteDoc(doc(this.usersCollection, userId));
      console.log('✅ User profile deleted');

      // Step 6: Reinitialize user profile with default values
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
}

// Export singleton instance
export const userLevelService = new UserLevelService();
