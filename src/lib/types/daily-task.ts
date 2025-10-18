/**
 * @fileOverview Daily Task System Type Definitions
 *
 * This file defines all TypeScript types and interfaces for the Daily Task System (每日修身).
 *
 * Core types:
 * - DailyTask: Individual task definition with content and grading criteria
 * - DailyTaskProgress: User's daily task completion progress
 * - TaskReward: Reward structure for completed tasks
 * - TaskCompletionResult: Result of task submission
 *
 * Task types:
 * - morning_reading: 晨讀時光 (5 min) - Reading comprehension
 * - poetry: 詩詞韻律 (3 min) - Poetry recitation/memorization
 * - character_insight: 人物洞察 (5 min) - Character analysis
 * - cultural_exploration: 文化探秘 (10 min) - Cultural knowledge quiz
 * - commentary_decode: 脂批解密 (8 min) - Commentary interpretation
 */

import { Timestamp } from 'firebase/firestore';
import { AttributePoints } from './user-level';

/**
 * Task type enum for different daily task categories
 */
export enum DailyTaskType {
  MORNING_READING = 'morning_reading',     // 晨讀時光
  POETRY = 'poetry',                       // 詩詞韻律
  CHARACTER_INSIGHT = 'character_insight', // 人物洞察
  CULTURAL_EXPLORATION = 'cultural_exploration', // 文化探秘
  COMMENTARY_DECODE = 'commentary_decode', // 脂批解密
}

/**
 * Task difficulty levels
 */
export enum TaskDifficulty {
  EASY = 'easy',       // 簡單 - for Level 0-1 users
  MEDIUM = 'medium',   // 中等 - for Level 2-4 users
  HARD = 'hard',       // 困難 - for Level 5+ users
}

/**
 * Task completion status
 */
export enum TaskStatus {
  NOT_STARTED = 'not_started',   // 未開始
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 已完成
  SKIPPED = 'skipped',           // 已跳過
}

/**
 * Text passage for morning reading task
 */
export interface TextPassage {
  chapter: number;           // 章回編號
  startLine: number;         // 起始行號
  endLine: number;           // 結束行號
  text: string;              // 文本內容
  question: string;          // 理解度問題
  expectedKeywords?: string[]; // 預期關鍵詞 (用於AI評分)
}

/**
 * Poetry content for poetry recitation task
 */
export interface PoemContent {
  id: string;                // 詩詞 ID
  title: string;             // 詩詞標題
  author: string;            // 作者
  content: string;           // 詩詞原文
  chapter?: number;          // 出現章回 (可選)
  difficulty: number;        // 難度評分 (1-10)
  theme?: string;            // 主題 (花、月、風、雨等)
}

/**
 * Character analysis prompt
 */
export interface CharacterPrompt {
  characterId: string;       // 角色 ID
  characterName: string;     // 角色名稱
  analysisPrompts: string[]; // 分析提示問題
  chapter?: number;          // 相關章回
  context?: string;          // 情境背景
}

/**
 * Cultural element for exploration task
 */
export interface CulturalElement {
  id: string;                // 文化元素 ID
  category: string;          // 類別 (禮儀、服飾、建築、飲食等)
  title: string;             // 標題
  description: string;       // 描述
  relatedChapters: number[]; // 相關章回
  questions: QuizQuestion[]; // 測驗問題
}

/**
 * Quiz question structure
 */
export interface QuizQuestion {
  id: string;                // 問題 ID
  question: string;          // 問題文本
  type: 'multiple_choice' | 'true_false' | 'short_answer'; // 題型
  options?: string[];        // 選項 (選擇題)
  correctAnswer: string | string[]; // 正確答案
  explanation?: string;      // 解釋說明
}

/**
 * Commentary interpretation content
 */
export interface CommentaryContent {
  id: string;                // 批語 ID
  originalText: string;      // 原文
  commentaryText: string;    // 脂硯齋批語
  chapter: number;           // 章回
  author: string;            // 批者 (脂硯齋、畸笏叟等)
  hint?: string;             // 提示
}

/**
 * Task grading criteria
 */
export interface GradingCriteria {
  minLength?: number;        // 最小字數要求
  maxLength?: number;        // 最大字數限制
  requiredKeywords?: string[]; // 必須包含的關鍵詞
  evaluationPrompt?: string; // AI 評分提示詞
  rubric?: {                 // 評分標準
    accuracy?: number;       // 準確度權重 (%)
    depth?: number;          // 深度權重 (%)
    insight?: number;        // 洞察力權重 (%)
    completeness?: number;   // 完整度權重 (%)
  };
}

/**
 * Daily Task definition
 * Represents a single task that can be assigned to users
 */
export interface DailyTask {
  id: string;                // Unique task ID
  type: DailyTaskType;       // Task type category
  title: string;             // Task title (localized)
  description: string;       // Task description (localized)
  difficulty: TaskDifficulty; // Difficulty level
  timeEstimate: number;      // Estimated time in minutes
  xpReward: number;          // Base XP reward
  attributeRewards: Partial<AttributePoints>; // Attribute points rewards

  // Task content (type-specific)
  content: {
    textPassage?: TextPassage;
    poem?: PoemContent;
    character?: CharacterPrompt;
    culturalElement?: CulturalElement;
    commentary?: CommentaryContent;
  };

  // Grading configuration
  gradingCriteria?: GradingCriteria;

  // Metadata
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/**
 * Task assignment record
 * Tracks a specific task assigned to a user
 */
export interface DailyTaskAssignment {
  taskId: string;            // Reference to DailyTask.id
  assignedAt: Timestamp;     // When the task was assigned
  startedAt?: Timestamp;     // When user started the task
  completedAt?: Timestamp;   // When user completed the task
  skippedAt?: Timestamp;     // When user skipped the task

  // User submission
  userResponse?: string;     // User's answer/response
  submissionTime?: number;   // Time taken to complete (seconds)

  // Evaluation results
  aiScore?: number;          // AI-generated score (0-100)
  xpAwarded?: number;        // Actual XP awarded (base + quality bonus)
  attributeGains?: Partial<AttributePoints>; // Attribute points gained
  feedback?: string;         // AI-generated feedback

  // Status
  status: TaskStatus;        // Current status
}

/**
 * Daily task progress for a user on a specific date
 * Firestore collection: dailyTaskProgress
 */
export interface DailyTaskProgress {
  id: string;                // Document ID: {userId}_{date}
  userId: string;            // User ID
  date: string;              // Date in YYYY-MM-DD format (UTC+8)

  // Assigned tasks for the day
  tasks: DailyTaskAssignment[]; // List of assigned tasks

  // Progress tracking
  completedTaskIds: string[]; // IDs of completed tasks
  skippedTaskIds: string[];   // IDs of skipped tasks
  totalXPEarned: number;      // Total XP earned today
  totalAttributeGains: Partial<AttributePoints>; // Total attribute gains

  // Streak tracking
  streak: number;             // Current consecutive completion streak
  lastCompletedAt?: Timestamp; // Last task completion time

  // Metadata
  createdAt: Timestamp;       // When the progress record was created
  updatedAt: Timestamp;       // Last update time
}

/**
 * Task reward structure
 * Defines immediate and delayed rewards for task completion
 */
export interface TaskReward {
  // Immediate rewards (awarded right after completion)
  immediately: {
    xp: number;              // Experience points
    coins?: number;          // Virtual currency (future feature)
    attributePoints: Partial<AttributePoints>; // Attribute boosts
  };

  // Delayed/conditional rewards
  delayed?: {
    unlockContent?: string[]; // Content IDs to unlock
    socialRecognition?: {     // Social/community rewards
      badge?: string;         // Badge ID
      title?: string;         // Title/achievement
    };
    rareDrops?: string[];     // Collectible item IDs (future feature)
  };
}

/**
 * Task completion result
 * Returned after user submits a task
 */
export interface TaskCompletionResult {
  success: boolean;          // Whether submission was successful
  taskId: string;            // Task ID

  // Evaluation results
  score: number;             // AI-generated score (0-100)
  feedback: string;          // Personalized feedback
  highlightedInsights?: string[]; // Key insights identified
  mistakes?: Array<{         // Identified mistakes (for poetry/quiz)
    expected: string;
    actual: string;
    position?: number;
  }>;

  // Rewards
  xpAwarded: number;         // Total XP awarded
  attributeGains: Partial<AttributePoints>; // Attribute gains
  rewards: TaskReward;       // All rewards

  // Level-up tracking
  leveledUp: boolean;        // Whether user leveled up
  newLevel?: number;         // New level (if leveled up)
  fromLevel?: number;        // Previous level (if leveled up)

  // Streak tracking
  newStreak: number;         // Updated streak count
  isStreakMilestone: boolean; // Whether hit a milestone (7, 30, 100 days)
  streakBonus?: number;      // Bonus XP from streak

  // Error information (if any)
  error?: string;            // Error message
}

/**
 * Task history record
 * Long-term storage of task completions
 * Firestore collection: dailyTaskHistory
 */
export interface TaskHistoryRecord {
  id: string;                // Unique record ID
  userId: string;            // User ID
  taskId: string;            // Task ID
  taskType: DailyTaskType;   // Task type
  date: string;              // Completion date (YYYY-MM-DD)

  // Results
  score: number;             // Score achieved
  xpAwarded: number;         // XP awarded
  completionTime: number;    // Time taken (seconds)

  // Metadata
  completedAt: Timestamp;    // Completion timestamp
}

/**
 * Streak milestone configuration
 */
export interface StreakMilestone {
  days: number;              // Number of consecutive days
  bonusMultiplier: number;   // XP bonus multiplier (e.g., 1.1 for +10%)
  badge?: string;            // Special badge ID
  title?: string;            // Special title
}

/**
 * Daily task configuration
 * Defines the task generation rules
 */
export interface DailyTaskConfig {
  tasksPerDay: number;       // Number of tasks per day (default: 2)
  allowSkip: boolean;        // Whether users can skip tasks
  skipLimit: number;         // Max skips per day (default: 1)

  // Task type weights for generation
  typeWeights: Record<DailyTaskType, number>; // Probability weights

  // Difficulty progression
  difficultyMapping: {
    easy: number[];          // User levels for easy tasks
    medium: number[];        // User levels for medium tasks
    hard: number[];          // User levels for hard tasks
  };

  // Streak milestones
  streakMilestones: StreakMilestone[];
}

/**
 * Task statistics for analytics
 */
export interface TaskStatistics {
  totalCompleted: number;    // Total tasks completed
  totalSkipped: number;      // Total tasks skipped
  averageScore: number;      // Average score across all tasks
  averageCompletionTime: number; // Average time in seconds
  completionRate: number;    // Completion rate (0-1)

  // Type-specific stats
  byType: Record<DailyTaskType, {
    completed: number;
    averageScore: number;
    averageTime: number;
  }>;

  // Streak stats
  longestStreak: number;     // Longest consecutive streak
  currentStreak: number;     // Current streak
}
