/**
 * @fileOverview User Level System Type Definitions
 *
 * This file contains all TypeScript type definitions for the gamification
 * user level system "紅樓修行路" (Red Mansion Cultivation Path).
 *
 * The level system provides:
 * - 8-level progression path from visitor to grand master
 * - Experience points (XP) system for tracking progress
 * - Permission-based feature unlocking
 * - Visual rewards (badges, avatar frames, titles)
 * - Attribute points system for skill tracking
 *
 * Design principles:
 * - Clear progression milestones
 * - Meaningful rewards at each level
 * - Permission-based content gating
 * - Visual feedback for achievements
 * - Cultural authenticity (based on Red Chamber themes)
 */

/**
 * Timestamp-like type for date fields (SQLITE-025: Firebase removed)
 * Matches the return type of fromUnixTimestamp() from sqlite-db
 */
export type Timestamp = {
  seconds: number;
  nanoseconds: number;
  toMillis: () => number;
  toDate: () => Date;
  isEqual: (other: any) => boolean;
};

/**
 * Permission types that can be granted at different user levels
 * Each permission unlocks specific features or content areas
 */
export enum LevelPermission {
  // Basic permissions (Level 0-1)
  BASIC_READING = 'basic_reading',                  // Read first 5 chapters
  SIMPLE_AI_QA = 'simple_ai_qa',                    // Basic AI Q&A interactions

  // Intermediate permissions (Level 2-3)
  DAILY_TASKS = 'daily_tasks',                      // Access to daily task system
  BASIC_ACHIEVEMENTS = 'basic_achievements',        // Basic achievement collection
  POETRY_LISTENING = 'poetry_listening',            // Join poetry discussions
  EXPERT_READINGS_BASIC = 'expert_readings_basic',  // Basic expert interpretations
  GARDEN_3D_VIEW = 'garden_3d_view',               // 3D Grand View Garden exploration

  // Advanced permissions (Level 4-5)
  POETRY_COMPETITION = 'poetry_competition',        // Participate in poetry competitions
  STUDY_GROUP_CREATE = 'study_group_create',       // Create study groups
  ADVANCED_AI_ANALYSIS = 'advanced_ai_analysis',   // Advanced AI text analysis
  CHARACTER_RELATIONSHIP_MAP = 'character_relationship_map', // Interactive character maps

  // Expert permissions (Level 6-7)
  EXPERT_READINGS_FULL = 'expert_readings_full',   // Full expert commentary access
  SPECIAL_TOPICS = 'special_topics',               // Special topic discussions
  MENTOR_ROLE = 'mentor_role',                     // Mentor new users
  EXCLUSIVE_EVENTS = 'exclusive_events',           // Exclusive cultural events
  RESEARCH_TOOLS = 'research_tools',               // Advanced research features
  ANNOTATION_PUBLISH = 'annotation_publish',       // Publish scholarly annotations
}

/**
 * Visual reward types that users receive upon leveling up
 * Provides aesthetic customization and status display
 */
export interface VisualRewards {
  /**
   * Avatar frame/border design
   * Each level has unique frame styling and colors
   */
  avatarFrame: string;

  /**
   * Color scheme for user title display
   * Uses CSS color values (hex, hsl, etc.)
   */
  titleColor: string;

  /**
   * Array of exclusive badge IDs unlocked at this level
   * Badges are displayed on profile and achievements page
   */
  exclusiveBadges: string[];

  /**
   * Special visual effects for profile display
   * Examples: particle effects, animated backgrounds, glow effects
   */
  profileEffects?: string[];
}

/**
 * User attribute points representing different skill areas
 * Attributes increase through specific activities and achievements
 * Used for personalized content recommendations and skill tracking
 */
export interface AttributePoints {
  /**
   * Poetry appreciation and creation skill (詩詞鑑賞)
   * Increases through poetry reading, competitions, and creation
   * Range: 0-100
   */
  poetrySkill: number;

  /**
   * Cultural and historical knowledge (文化素養)
   * Increases through cultural exploration and learning
   * Range: 0-100
   */
  culturalKnowledge: number;

  /**
   * Text analysis and critical thinking ability (分析思辨)
   * Increases through discussion, analysis, and annotations
   * Range: 0-100
   */
  analyticalThinking: number;

  /**
   * Community engagement and social influence (社交影響)
   * Increases through community participation and helpfulness
   * Range: 0-100
   */
  socialInfluence: number;

  /**
   * Reading consistency and dedication (學習毅力)
   * Increases through reading streaks and goal completion
   * Range: 0-100
   */
  learningPersistence: number;
}

/**
 * Level metadata defining each user level's characteristics
 * Immutable configuration data for the 8-level progression system
 */
export interface UserLevel {
  /**
   * Unique identifier for the level (0-7)
   */
  id: number;

  /**
   * Display title in Traditional Chinese
   * Examples: "賈府訪客", "陪讀書僮", "一代宗師"
   */
  title: string;

  /**
   * English translation of level title
   * Examples: "Mansion Visitor", "Reading Companion", "Grand Master"
   */
  titleEn: string;

  /**
   * Level description explaining the user's status
   * Displayed in level-up modals and profile pages
   */
  description: string;

  /**
   * Total XP required to reach this level
   * Level 0: 0 XP, Level 7: 3000 XP
   */
  requiredXP: number;

  /**
   * XP needed from previous level to reach this level
   * Used for progress bar calculations
   */
  xpFromPrevious: number;

  /**
   * Array of permissions unlocked at this level
   * Cumulative: higher levels inherit all previous permissions
   */
  permissions: LevelPermission[];

  /**
   * Array of content IDs/types unlocked at this level
   * Examples: chapter ranges, expert commentary, special features
   */
  exclusiveContent: string[];

  /**
   * Visual rewards granted upon reaching this level
   * Includes avatar frames, badges, and profile effects
   */
  visualRewards: VisualRewards;

  /**
   * Special requirements beyond XP for level-up
   * Examples: complete quiz, read specific chapters, community participation
   */
  specialRequirements?: {
    type: 'quiz' | 'chapters_read' | 'tasks_completed' | 'community_contribution';
    description: string;
    target: number | string;
  }[];

  /**
   * Residence/location unlocked at this level (cultural element)
   * Examples: "怡紅院" (Yihong Courtyard), "瀟湘館" (Xiaoxiang Lodge)
   */
  virtualResidence?: string;
}

/**
 * Individual user's progress and profile data
 * Stored in SQLite `users` table (Phase 4 - SQLITE-022)
 * Updated frequently as user progresses through the platform
 */
export interface UserProfile {
  /**
   * User ID (primary key) - from NextAuth or generated for guest users
   */
  userId: string;

  /**
   * User display name
   */
  username: string;

  /**
   * User email address (from NextAuth or generated for guest users)
   */
  email: string;

  /**
   * Password hash (bcrypt) - stored in SQLite for credentials authentication
   * Phase 4 - SQLITE-022: Moved from Firebase to SQLite
   */
  passwordHash?: string;

  /**
   * Guest user flag - true for anonymous/guest users
   * Phase 4 - SQLITE-021: Added for guest login support
   */
  isGuest?: boolean;

  /**
   * Current user level (0-7)
   * Determines available features and content
   */
  currentLevel: number;

  /**
   * Current XP points within current level
   * Resets when user levels up
   * Range: 0 to (next level required XP - current level required XP)
   */
  currentXP: number;

  /**
   * Total cumulative XP earned across all levels
   * Never decreases, used for leaderboards and statistics
   */
  totalXP: number;

  /**
   * XP required to reach the next level
   * Calculated from level configuration
   */
  nextLevelXP: number;

  /**
   * Array of completed task IDs
   * Used for tracking daily tasks, quizzes, and special requirements
   */
  completedTasks: string[];

  /**
   * Array of unlocked content IDs
   * Tracks which chapters, features, and content user has access to
   */
  unlockedContent: string[];

  /**
   * Array of completed chapter IDs (chapter numbers)
   * Prevents duplicate XP rewards for the same chapter
   * Persisted to Firestore for consistency across sessions
   */
  completedChapters: number[];

  /**
   * Flag indicating whether user has received the one-time welcome bonus
   * Set to true after awarding NEW_USER_WELCOME_BONUS on first reading page visit
   * Prevents duplicate welcome bonuses
   */
  hasReceivedWelcomeBonus: boolean;

  /**
   * User's skill attribute points
   * Updated through various learning activities
   */
  attributes: AttributePoints;

  /**
   * Reading statistics
   * Tracks user engagement and progress
   */
  stats: {
    /**
     * Total chapters completed (out of 120)
     */
    chaptersCompleted: number;

    /**
     * Total reading time in minutes
     */
    totalReadingTimeMinutes: number;

    /**
     * Total notes written
     */
    notesCount: number;

    /**
     * Current reading streak in days
     */
    currentStreak: number;

    /**
     * Longest reading streak in days
     */
    longestStreak: number;

    /**
     * Total AI interactions
     */
    aiInteractionsCount: number;

    /**
     * Community posts created
     */
    communityPostsCount: number;

    /**
     * Community likes received
     */
    communityLikesReceived: number;
  };

  /**
   * Timestamp of account creation
   */
  createdAt: Timestamp;

  /**
   * Timestamp of last profile update
   */
  updatedAt: Timestamp;

  /**
   * Timestamp of last activity (login, reading, interaction)
   * Used for calculating activity streaks
   */
  lastActivityAt: Timestamp;
}

/**
 * Record of user level-up events
 * Stored in Firestore `levelUps` collection for analytics and history
 */
export interface LevelUpRecord {
  /**
   * Unique ID for this level-up record
   */
  id: string;

  /**
   * User ID who leveled up
   */
  userId: string;

  /**
   * Previous level before level-up
   */
  fromLevel: number;

  /**
   * New level after level-up
   */
  toLevel: number;

  /**
   * Total XP at time of level-up
   */
  totalXPAtLevelUp: number;

  /**
   * Timestamp of level-up event
   */
  timestamp: Timestamp;

  /**
   * Reason or trigger for XP award that caused level-up
   * Examples: "Completed Chapter 5", "Won Poetry Competition"
   */
  triggerReason?: string;
}

/**
 * XP transaction record for tracking XP changes
 * Used for auditing and displaying XP history to users
 */
export interface XPTransaction {
  /**
   * Unique transaction ID
   */
  id: string;

  /**
   * User ID who received/lost XP
   */
  userId: string;

  /**
   * Amount of XP change (positive for gain, negative for loss)
   */
  amount: number;

  /**
   * Reason for XP change
   * Examples: "Chapter 10 completed", "Daily task: morning reading"
   */
  reason: string;

  /**
   * Source type of XP change
   */
  source: 'reading' | 'task' | 'community' | 'poetry' | 'ai_interaction' | 'achievement' | 'admin';

  /**
   * Reference ID to the source action
   * Example: post ID, chapter ID, task ID
   */
  sourceId?: string;

  /**
   * User's total XP after this transaction
   */
  newTotalXP: number;

  /**
   * User's level after this transaction
   */
  newLevel: number;

  /**
   * Whether this transaction triggered a level-up
   */
  causedLevelUp: boolean;

  /**
   * Timestamp of transaction
   */
  timestamp: Timestamp;
}

/**
 * Level requirement check result
 * Used for determining if user can level up
 */
export interface LevelRequirementCheck {
  /**
   * Whether user meets all requirements for next level
   */
  canLevelUp: boolean;

  /**
   * XP requirement met
   */
  xpRequirementMet: boolean;

  /**
   * XP still needed (0 if met)
   */
  xpNeeded: number;

  /**
   * Special requirements status
   * Each requirement with completion status
   */
  specialRequirements?: {
    type: string;
    description: string;
    completed: boolean;
    progress: number;
    target: number;
  }[];
}
