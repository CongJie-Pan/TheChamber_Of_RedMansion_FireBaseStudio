/**
 * @fileOverview Daily Task Service for Gamification System
 *
 * This service manages the Daily Task System (每日修身) operations:
 * - Task generation and assignment
 * - User progress tracking
 * - Task completion and evaluation
 * - Reward distribution
 * - Streak management
 *
 * Core responsibilities:
 * - Generate personalized daily tasks based on user level and history
 * - Track user progress and completion status
 * - Integrate with AI flows for task evaluation
 * - Award XP and attribute points through user-level-service
 * - Maintain streak counters and milestones
 * - Prevent task farming and duplicate rewards
 *
 * Database Collections:
 * - dailyTasks: Task templates and definitions
 * - dailyTaskProgress: User daily progress records
 * - dailyTaskHistory: Long-term completion history
 *
 * Design Principles:
 * - Atomic operations for data consistency
 * - Real-time progress updates
 * - Graceful degradation without Firebase
 * - Type-safe operations
 * - Comprehensive error handling
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
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { userLevelService } from './user-level-service';
import { taskGenerator } from './task-generator';
import {
  DailyTask,
  DailyTaskProgress,
  DailyTaskAssignment,
  TaskReward,
  TaskCompletionResult,
  TaskHistoryRecord,
  TaskStatus,
  DailyTaskType,
  TaskDifficulty,
  TaskStatistics,
  StreakMilestone,
} from './types/daily-task';
import { AttributePoints } from './types/user-level';

// Phase 2: AI Flow Integrations for Task Evaluation
import { assessReadingComprehension } from '@/ai/flows/daily-reading-comprehension';
import { assessPoetryQuality } from '@/ai/flows/poetry-quality-assessment';
import { scoreCharacterAnalysis } from '@/ai/flows/character-analysis-scoring';
import { gradeCulturalQuiz } from '@/ai/flows/cultural-quiz-grading';
import { scoreCommentaryInterpretation } from '@/ai/flows/commentary-interpretation';

/**
 * Streak milestone configuration
 * Defines bonus rewards for maintaining task completion streaks
 */
const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 7, bonusMultiplier: 1.1, badge: 'streak-7-days', title: '七日連擊' },
  { days: 30, bonusMultiplier: 1.2, badge: 'streak-30-days', title: '月度堅持' },
  { days: 100, bonusMultiplier: 1.3, badge: 'streak-100-days', title: '百日修行' },
  { days: 365, bonusMultiplier: 1.5, badge: 'streak-365-days', title: '年度大師' },
];

/**
 * Base XP rewards for different task types
 * Actual rewards include quality bonuses
 */
const BASE_XP_REWARDS = {
  [DailyTaskType.MORNING_READING]: 10,        // 晨讀時光: 10 XP
  [DailyTaskType.POETRY]: 8,                  // 詩詞韻律: 8 XP
  [DailyTaskType.CHARACTER_INSIGHT]: 12,      // 人物洞察: 12 XP
  [DailyTaskType.CULTURAL_EXPLORATION]: 15,   // 文化探秘: 15 XP
  [DailyTaskType.COMMENTARY_DECODE]: 18,      // 脂批解密: 18 XP
};

/**
 * Attribute rewards for different task types
 */
const ATTRIBUTE_REWARDS: Record<DailyTaskType, Partial<AttributePoints>> = {
  [DailyTaskType.MORNING_READING]: {
    analyticalThinking: 1,
    culturalKnowledge: 1,
  },
  [DailyTaskType.POETRY]: {
    poetrySkill: 2,
    culturalKnowledge: 1,
  },
  [DailyTaskType.CHARACTER_INSIGHT]: {
    analyticalThinking: 2,
    socialInfluence: 1,
  },
  [DailyTaskType.CULTURAL_EXPLORATION]: {
    culturalKnowledge: 3,
  },
  [DailyTaskType.COMMENTARY_DECODE]: {
    analyticalThinking: 2,
    culturalKnowledge: 2,
  },
};

/**
 * Task submission cooldown in milliseconds (5 seconds)
 * Prevents spam submissions
 */
const SUBMISSION_COOLDOWN_MS = 5000;

/**
 * AI evaluation timeout in milliseconds (3 seconds)
 * Phase 4.8: Performance optimization - prevent hanging AI calls
 */
const AI_EVALUATION_TIMEOUT_MS = 3000;

/**
 * Task cache TTL in milliseconds (5 minutes)
 * Phase 4.8: Performance optimization - reduce Firestore reads
 */
const TASK_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Helper function to get today's date string in YYYY-MM-DD format (UTC+8)
 * Uses Taiwan/Taipei timezone
 */
function getTodayDateString(): string {
  const now = new Date();
  // Convert to UTC+8 (Taipei timezone)
  const utc8Offset = 8 * 60 * 60 * 1000;
  const localDate = new Date(now.getTime() + utc8Offset);
  return localDate.toISOString().split('T')[0];
}

/**
 * Helper function to check if two dates are consecutive
 */
function areConsecutiveDates(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Timeout wrapper for async operations
 * Phase 4.8: Performance optimization
 *
 * @param promise - Promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param fallbackValue - Value to return on timeout
 * @returns Promise that resolves with result or fallback value on timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Daily Task Service Class
 * Singleton service for managing daily tasks
 */
export class DailyTaskService {
  private dailyTasksCollection = collection(db, 'dailyTasks');
  private dailyTaskProgressCollection = collection(db, 'dailyTaskProgress');
  private dailyTaskHistoryCollection = collection(db, 'dailyTaskHistory');

  // Cache for last submission time (prevents spam)
  private lastSubmissionTimes: Map<string, number> = new Map();

  // Phase 4.8: Task cache for performance optimization
  private taskCache: Map<string, { task: DailyTask; timestamp: number }> = new Map();

  /**
   * Generate daily tasks for a user on a specific date
   * This method should be called once per day per user
   *
   * Phase 4.1.2: Now includes adaptive difficulty based on historical performance
   *
   * @param userId - User ID
   * @param date - Date in YYYY-MM-DD format (defaults to today)
   * @returns Promise with array of generated tasks
   */
  async generateDailyTasks(userId: string, date?: string): Promise<DailyTask[]> {
    try {
      const targetDate = date || getTodayDateString();

      // Check if tasks already generated for this date
      const existingProgress = await this.getUserDailyProgress(userId, targetDate);
      if (existingProgress && existingProgress.tasks.length > 0) {
        console.log(`✅ Tasks already generated for user ${userId} on ${targetDate}`);
        // Return the existing tasks
        return this.getTasksFromAssignments(existingProgress.tasks);
      }

      // Get user profile to determine difficulty
      const userProfile = await userLevelService.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // Fetch task history for adaptive difficulty (Phase 4.1.2)
      const taskHistory = await this.getTaskHistory(userId, 30);

      // Use TaskGenerator to generate personalized tasks with adaptive difficulty
      const tasks = await taskGenerator.generateTasksForUser(
        userId,
        userProfile.currentLevel,
        targetDate,
        undefined, // recentTaskIds - for future variety enhancement
        taskHistory // Pass history for adaptive difficulty
      );

      // Store generated tasks in Firestore for later retrieval
      for (const task of tasks) {
        await setDoc(doc(this.dailyTasksCollection, task.id), task);
      }

      // Create task assignments
      const assignments: DailyTaskAssignment[] = tasks.map((task) => ({
        taskId: task.id,
        assignedAt: Timestamp.now(),
        status: TaskStatus.NOT_STARTED,
      }));

      // Create or update progress record
      const progressId = `${userId}_${targetDate}`;
      const progressData: Omit<DailyTaskProgress, 'id'> & { id: string } = {
        id: progressId,
        userId,
        date: targetDate,
        tasks: assignments,
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        usedSourceIds: [], // Phase 4.4: Initialize anti-farming tracker
        streak: await this.calculateStreak(userId, targetDate),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(this.dailyTaskProgressCollection, progressId), progressData);

      console.log(`✅ Generated ${tasks.length} daily tasks for user ${userId} on ${targetDate}`);
      return tasks;
    } catch (error) {
      console.error('Error generating daily tasks:', error);
      throw new Error('Failed to generate daily tasks. Please try again.');
    }
  }

  /**
   * Get user's daily progress for a specific date
   *
   * @param userId - User ID
   * @param date - Date in YYYY-MM-DD format (defaults to today)
   * @returns Promise with daily progress or null if not found
   */
  async getUserDailyProgress(userId: string, date?: string): Promise<DailyTaskProgress | null> {
    try {
      const targetDate = date || getTodayDateString();
      const progressId = `${userId}_${targetDate}`;

      const progressDoc = await getDoc(doc(this.dailyTaskProgressCollection, progressId));

      if (!progressDoc.exists()) {
        return null;
      }

      const data = progressDoc.data() as DocumentData;
      return {
        id: progressDoc.id,
        ...data,
        createdAt: data.createdAt || Timestamp.now(),
        updatedAt: data.updatedAt || Timestamp.now(),
      } as DailyTaskProgress;
    } catch (error) {
      console.error('Error fetching daily progress:', error);
      return null;
    }
  }

  /**
   * Submit task completion
   * Evaluates user response, awards rewards, updates streak
   *
   * @param userId - User ID
   * @param taskId - Task ID
   * @param userResponse - User's answer/response
   * @returns Promise with completion result
   */
  async submitTaskCompletion(
    userId: string,
    taskId: string,
    userResponse: string
  ): Promise<TaskCompletionResult> {
    try {
      // 1. Check submission cooldown (anti-spam)
      const lastSubmitTime = this.lastSubmissionTimes.get(userId) || 0;
      const now = Date.now();
      if (now - lastSubmitTime < SUBMISSION_COOLDOWN_MS) {
        const waitTime = Math.ceil((SUBMISSION_COOLDOWN_MS - (now - lastSubmitTime)) / 1000);
        throw new Error(`Please wait ${waitTime} seconds before submitting again.`);
      }
      this.lastSubmissionTimes.set(userId, now);

      // 2. Get today's progress
      const todayDate = getTodayDateString();
      const progress = await this.getUserDailyProgress(userId, todayDate);
      if (!progress) {
        throw new Error('No tasks assigned for today. Please refresh the page.');
      }

      // 3. Find the task assignment
      const assignment = progress.tasks.find((t) => t.taskId === taskId);
      if (!assignment) {
        throw new Error('Task not found in today\'s assignments.');
      }

      // 4. Check if already completed
      if (assignment.status === TaskStatus.COMPLETED) {
        throw new Error('This task has already been completed.');
      }

      // 5. Get task details (for evaluation)
      const task = await this.getTaskById(taskId);
      if (!task) {
        throw new Error('Task details not found.');
      }

      // 5.5. Phase 4.4: Check sourceId deduplication (anti-farming)
      const usedSourceIds = progress.usedSourceIds || [];
      if (task.sourceId && usedSourceIds.includes(task.sourceId)) {
        throw new Error('You have already completed this content today. Duplicate rewards are not allowed.');
      }

      // 5.6. Cross-system deduplication check (prevents duplicate rewards from reading page)
      // If the task has a content sourceId, check if it's been used globally
      // This prevents users from getting XP twice for the same content
      // (e.g., completing Chapter 3 in reading page, then the same chapter in daily tasks)
      if (task.sourceId) {
        const globalDuplicate = await userLevelService.checkDuplicateReward(
          userId,
          task.sourceId
        );
        if (globalDuplicate) {
          console.log(`⚠️ Cross-system duplicate detected: ${task.sourceId}`);
          throw new Error('您已經在其他活動中完成了此內容。不允許重複獎勵。\n(You have already completed this content in another activity. Duplicate rewards are not allowed.)');
        }
      }

      // 6. Evaluate task quality using AI (placeholder - will be implemented in Phase 2)
      const startTime = assignment.startedAt?.toMillis() || now;
      const submissionTime = Math.floor((now - startTime) / 1000);
      const score = await this.evaluateTaskQuality(task, userResponse);
      const feedback = this.generateFeedback(task.type, score);

      // 7. Calculate rewards
      const baseXP = BASE_XP_REWARDS[task.type];
      const qualityBonus = Math.floor((score / 100) * baseXP * 0.5); // Up to 50% bonus
      const totalXP = baseXP + qualityBonus;

      // 8. Apply streak bonus
      const currentStreak = progress.streak;
      const streakBonus = this.calculateStreakBonus(currentStreak, totalXP);
      const finalXP = totalXP + streakBonus;

      // 9. Award XP through user-level-service
      // Use content-based sourceId to prevent duplicate rewards across systems
      // If the task has a content sourceId (e.g., "chapter-3-passage-1-10"),
      // use that instead of the generic daily-task ID to ensure that
      // completing the same content in reading page won't allow duplicate XP
      const xpSourceId = task.sourceId || `daily-task-${taskId}-${todayDate}`;

      const xpResult = await userLevelService.awardXP(
        userId,
        finalXP,
        `Completed daily task: ${task.title}`,
        'daily_task',
        xpSourceId
      );

      // 10. Award attribute points
      const attributeGains = task.attributeRewards;
      await userLevelService.updateAttributes(userId, attributeGains);

      // 11. Update task assignment
      const updatedAssignment: DailyTaskAssignment = {
        ...assignment,
        completedAt: Timestamp.now(),
        userResponse,
        submissionTime,
        aiScore: score,
        xpAwarded: finalXP,
        attributeGains,
        feedback,
        status: TaskStatus.COMPLETED,
      };

      // 12. Update progress record
      const updatedTasks = progress.tasks.map((t) =>
        t.taskId === taskId ? updatedAssignment : t
      );

      const updatedProgress: Partial<DailyTaskProgress> = {
        tasks: updatedTasks,
        completedTaskIds: [...progress.completedTaskIds, taskId],
        totalXPEarned: progress.totalXPEarned + finalXP,
        totalAttributeGains: this.mergeAttributePoints(
          progress.totalAttributeGains,
          attributeGains
        ),
        // Phase 4.4: Add sourceId to prevent duplicate rewards
        usedSourceIds: task.sourceId ? [...usedSourceIds, task.sourceId] : usedSourceIds,
        lastCompletedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // 13. Update streak if all tasks completed
      const allCompleted = updatedTasks.every(
        (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
      );
      if (allCompleted) {
        updatedProgress.streak = await this.updateStreak(userId, todayDate);
      }

      await updateDoc(
        doc(this.dailyTaskProgressCollection, `${userId}_${todayDate}`),
        updatedProgress as any
      );

      // 14. Record in history
      await this.recordTaskHistory(userId, taskId, task.type, score, finalXP, submissionTime);

      // 15. Check for streak milestones
      const newStreak = updatedProgress.streak || currentStreak;
      const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak);
      const isStreakMilestone = !!milestone;

      console.log(`✅ Task completed: ${task.title} | Score: ${score} | XP: ${finalXP}`);

      // 16. Return completion result
      return {
        success: true,
        taskId,
        score,
        feedback,
        xpAwarded: finalXP,
        attributeGains,
        rewards: {
          immediately: {
            xp: finalXP,
            attributePoints: attributeGains,
          },
          delayed: milestone
            ? {
                socialRecognition: {
                  badge: milestone.badge,
                  title: milestone.title,
                },
              }
            : undefined,
        },
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
        fromLevel: xpResult.fromLevel,
        newStreak,
        isStreakMilestone,
        streakBonus,
      };
    } catch (error) {
      console.error('Error submitting task completion:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to submit task completion. Please try again.');
    }
  }

  /**
   * Evaluate task quality using AI
   * Integrates with specialized AI flows for each task type
   * Phase 4.8: Added timeout wrapper for performance optimization
   *
   * @param task - Task definition with content and grading criteria
   * @param userResponse - User's answer/submission
   * @returns Promise with score (0-100)
   */
  async evaluateTaskQuality(task: DailyTask, userResponse: string): Promise<number> {
    const startTime = Date.now();

    try {
      // Phase 4.8: Wrap AI evaluation with timeout to prevent hanging
      const score = await withTimeout(
        this.performAIEvaluation(task, userResponse),
        AI_EVALUATION_TIMEOUT_MS,
        60 // Fallback score if AI times out
      );

      // Log performance
      const duration = Date.now() - startTime;
      console.log(`✅ AI evaluation completed in ${duration}ms (target: <${AI_EVALUATION_TIMEOUT_MS}ms)`);

      return score;
    } catch (error) {
      console.error('Error evaluating task quality:', error);
      // Return a reasonable default score on AI failure
      return 60;
    }
  }

  /**
   * Internal AI evaluation logic (separated for timeout wrapping)
   * Phase 4.8: Performance optimization
   */
  private async performAIEvaluation(task: DailyTask, userResponse: string): Promise<number> {
    try {
      // Route to appropriate AI flow based on task type
      switch (task.type) {
        case DailyTaskType.MORNING_READING: {
          // Extract passage information
          const passage = task.content.textPassage;
          if (!passage) {
            console.warn('Morning reading task missing text passage');
            return 60;
          }

          const result = await assessReadingComprehension({
            passage: passage.text,
            question: passage.question,
            userAnswer: userResponse,
            expectedKeywords: passage.expectedKeywords || [],
            difficulty: task.difficulty,
          });

          return result.score;
        }

        case DailyTaskType.POETRY: {
          // Extract poem information
          const poem = task.content.poem;
          if (!poem) {
            console.warn('Poetry task missing poem content');
            return 60;
          }

          const result = await assessPoetryQuality({
            poemTitle: poem.title,
            originalPoem: poem.content,
            userRecitation: userResponse,
            author: poem.author,
            difficulty: task.difficulty,
          });

          return result.overallScore;
        }

        case DailyTaskType.CHARACTER_INSIGHT: {
          // Extract character information
          const character = task.content.character;
          if (!character) {
            console.warn('Character task missing character content');
            return 60;
          }

          const result = await scoreCharacterAnalysis({
            characterName: character.name,
            characterDescription: character.description,
            analysisPrompt: task.description,
            userAnalysis: userResponse,
            expectedThemes: character.traits || [],
            difficulty: task.difficulty,
          });

          return result.qualityScore;
        }

        case DailyTaskType.CULTURAL_EXPLORATION: {
          // Extract cultural quiz information
          const cultural = task.content.culturalKnowledge;
          if (!cultural) {
            console.warn('Cultural task missing cultural knowledge content');
            return 60;
          }

          // For quiz-type tasks, we may need to parse multiple Q&A pairs
          // For now, treat as single question-answer
          const result = await gradeCulturalQuiz({
            quizTitle: task.title,
            quizQuestions: [
              {
                question: cultural.question,
                correctAnswer: cultural.correctAnswer || '',
                userAnswer: userResponse,
                culturalContext: cultural.historicalContext || '',
              },
            ],
            difficulty: task.difficulty,
          });

          return result.score;
        }

        case DailyTaskType.COMMENTARY_DECODE: {
          // Extract commentary information
          const commentary = task.content.commentary;
          if (!commentary) {
            console.warn('Commentary task missing commentary content');
            return 60;
          }

          // Map to Genkit schema: commentaryText, relatedPassage, chapterContext, userInterpretation, interpretationHints, difficulty
          const result = await scoreCommentaryInterpretation({
            commentaryText: commentary.commentaryText,
            relatedPassage: commentary.originalText || '',
            chapterContext: `Chapter ${task.content.textPassage?.chapter || 'unknown'}`,
            userInterpretation: userResponse,
            interpretationHints: commentary.hint ? [commentary.hint] : [],
            difficulty: task.difficulty,
          });

          return result.score;
        }

        default:
          console.warn(`Unknown task type: ${task.type}`);
          // Fallback to basic length-based scoring
          const responseLength = userResponse.length;
          const minLength = task.gradingCriteria?.minLength || 50;

          if (responseLength < minLength) {
            return 40;
          } else if (responseLength < minLength * 2) {
            return 70;
          } else {
            return 85;
          }
      }
    } catch (error) {
      console.error('Error evaluating task quality:', error);
      // Return a reasonable default score on AI failure
      // This ensures the user experience continues even if AI is unavailable
      return 60;
    }
  }

  /**
   * Generate personalized feedback based on score
   *
   * @param taskType - Type of task
   * @param score - Score achieved (0-100)
   * @returns Feedback message
   */
  private generateFeedback(taskType: DailyTaskType, score: number): string {
    const feedbackTemplates = {
      excellent: [
        '太棒了！您的分析深入透徹，展現了對紅樓夢的深刻理解。',
        '出色的表現！您的見解令人印象深刻，繼續保持！',
        '精彩！您已經掌握了這部分內容的精髓。',
      ],
      good: [
        '很好！您的理解基本正確，繼續努力會更好。',
        '不錯的表現！多加練習會有更大進步。',
        '良好！您已經掌握了大部分要點。',
      ],
      average: [
        '還不錯，但還有進步空間。建議多閱讀相關章節。',
        '基本達標，繼續加油！建議深入思考文本含義。',
        '合格，但可以做得更好。試著從多角度分析。',
      ],
      needsWork: [
        '需要更多努力。建議重新閱讀相關內容，仔細思考。',
        '還需要加強。不要氣餒，學習需要時間和耐心。',
        '繼續努力！建議先掌握基礎知識，再深入學習。',
      ],
    };

    let category: keyof typeof feedbackTemplates;
    if (score >= 85) {
      category = 'excellent';
    } else if (score >= 70) {
      category = 'good';
    } else if (score >= 60) {
      category = 'average';
    } else {
      category = 'needsWork';
    }

    const templates = feedbackTemplates[category];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Calculate streak bonus XP
   *
   * @param streak - Current streak days
   * @param baseXP - Base XP before bonus
   * @returns Bonus XP amount
   */
  private calculateStreakBonus(streak: number, baseXP: number): number {
    const milestone = [...STREAK_MILESTONES]
      .reverse()
      .find((m) => streak >= m.days);

    if (milestone) {
      return Math.floor(baseXP * (milestone.bonusMultiplier - 1));
    }
    return 0;
  }

  /**
   * Calculate user's current streak
   *
   * @param userId - User ID
   * @param currentDate - Current date string
   * @returns Promise with streak count
   */
  private async calculateStreak(userId: string, currentDate: string): Promise<number> {
    try {
      // Get yesterday's progress
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayProgress = await this.getUserDailyProgress(userId, yesterdayStr);

      if (!yesterdayProgress) {
        // No history, start fresh
        return 0;
      }

      // Check if yesterday's tasks were completed
      const yesterdayCompleted = yesterdayProgress.tasks.every(
        (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
      );

      if (yesterdayCompleted) {
        // Continue streak
        return yesterdayProgress.streak + 1;
      } else {
        // Streak broken, start over
        return 0;
      }
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Update streak after completing all daily tasks
   *
   * @param userId - User ID
   * @param currentDate - Current date string
   * @returns Promise with updated streak count
   */
  private async updateStreak(userId: string, currentDate: string): Promise<number> {
    const newStreak = await this.calculateStreak(userId, currentDate);
    console.log(`🔥 Streak updated for user ${userId}: ${newStreak} days`);
    return newStreak + 1; // +1 for today
  }

  /**
   * Record task completion in history
   *
   * @param userId - User ID
   * @param taskId - Task ID
   * @param taskType - Task type
   * @param score - Score achieved
   * @param xpAwarded - XP awarded
   * @param completionTime - Time taken in seconds
   */
  private async recordTaskHistory(
    userId: string,
    taskId: string,
    taskType: DailyTaskType,
    score: number,
    xpAwarded: number,
    completionTime: number
  ): Promise<void> {
    try {
      const record: Omit<TaskHistoryRecord, 'id'> = {
        userId,
        taskId,
        taskType,
        date: getTodayDateString(),
        score,
        xpAwarded,
        completionTime,
        completedAt: Timestamp.now(),
      };

      await addDoc(this.dailyTaskHistoryCollection, record);
    } catch (error) {
      console.error('Error recording task history:', error);
      // Don't throw - history recording is not critical
    }
  }

  /**
   * Get task history for a user
   *
   * @param userId - User ID
   * @param limitCount - Number of records to fetch
   * @returns Promise with task history
   */
  async getTaskHistory(userId: string, limitCount: number = 30): Promise<TaskHistoryRecord[]> {
    try {
      const historyQuery = query(
        this.dailyTaskHistoryCollection,
        where('userId', '==', userId),
        orderBy('completedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(historyQuery);
      const history: TaskHistoryRecord[] = [];

      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          completedAt: data.completedAt || Timestamp.now(),
        } as TaskHistoryRecord);
      });

      return history;
    } catch (error) {
      console.error('Error fetching task history:', error);
      return [];
    }
  }

  /**
   * Get task statistics for a user
   *
   * @param userId - User ID
   * @returns Promise with task statistics
   */
  async getTaskStatistics(userId: string): Promise<TaskStatistics> {
    try {
      const history = await this.getTaskHistory(userId, 100);

      if (history.length === 0) {
        return {
          totalCompleted: 0,
          totalSkipped: 0,
          averageScore: 0,
          averageCompletionTime: 0,
          completionRate: 0,
          byType: {} as any,
          longestStreak: 0,
          currentStreak: 0,
        };
      }

      const totalCompleted = history.length;
      const averageScore = history.reduce((sum, h) => sum + h.score, 0) / totalCompleted;
      const averageCompletionTime = history.reduce((sum, h) => sum + h.completionTime, 0) / totalCompleted;

      // Calculate by-type stats
      const byType: any = {};
      Object.values(DailyTaskType).forEach((type) => {
        const typeTasks = history.filter((h) => h.taskType === type);
        if (typeTasks.length > 0) {
          byType[type] = {
            completed: typeTasks.length,
            averageScore: typeTasks.reduce((sum, h) => sum + h.score, 0) / typeTasks.length,
            averageTime: typeTasks.reduce((sum, h) => sum + h.completionTime, 0) / typeTasks.length,
          };
        }
      });

      // Get current streak
      const todayProgress = await this.getUserDailyProgress(userId);
      const currentStreak = todayProgress?.streak || 0;

      return {
        totalCompleted,
        totalSkipped: 0, // TODO: Track skipped tasks
        averageScore,
        averageCompletionTime,
        completionRate: 1.0, // TODO: Calculate actual rate
        byType,
        longestStreak: currentStreak, // TODO: Track longest streak
        currentStreak,
      };
    } catch (error) {
      console.error('Error calculating task statistics:', error);
      return {
        totalCompleted: 0,
        totalSkipped: 0,
        averageScore: 0,
        averageCompletionTime: 0,
        completionRate: 0,
        byType: {} as any,
        longestStreak: 0,
        currentStreak: 0,
      };
    }
  }

  /**
   * Helper: Calculate task difficulty based on user level
   */
  private calculateTaskDifficulty(userLevel: number): TaskDifficulty {
    if (userLevel >= 5) return TaskDifficulty.HARD;
    if (userLevel >= 2) return TaskDifficulty.MEDIUM;
    return TaskDifficulty.EASY;
  }

  /**
   * Helper: Merge attribute points
   */
  private mergeAttributePoints(
    base: Partial<AttributePoints>,
    add: Partial<AttributePoints>
  ): Partial<AttributePoints> {
    return {
      poetrySkill: (base.poetrySkill || 0) + (add.poetrySkill || 0),
      culturalKnowledge: (base.culturalKnowledge || 0) + (add.culturalKnowledge || 0),
      analyticalThinking: (base.analyticalThinking || 0) + (add.analyticalThinking || 0),
      socialInfluence: (base.socialInfluence || 0) + (add.socialInfluence || 0),
      learningPersistence: (base.learningPersistence || 0) + (add.learningPersistence || 0),
    };
  }

  /**
   * Helper: Get task by ID with caching
   * Phase 4.8: Performance optimization - reduces Firestore reads
   */
  private async getTaskById(taskId: string): Promise<DailyTask | null> {
    try {
      // Check cache first
      const cached = this.taskCache.get(taskId);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < TASK_CACHE_TTL_MS) {
        // Cache hit - return cached task
        return cached.task;
      }

      // Cache miss - fetch from Firestore
      const taskDoc = await getDoc(doc(this.dailyTasksCollection, taskId));
      if (!taskDoc.exists()) {
        return null;
      }

      const task = { id: taskDoc.id, ...taskDoc.data() } as DailyTask;

      // Update cache
      this.taskCache.set(taskId, { task, timestamp: now });

      return task;
    } catch (error) {
      console.error('Error getting task by ID:', error);
      return null;
    }
  }

  /**
   * Helper: Get tasks from assignments (placeholder)
   */
  private async getTasksFromAssignments(assignments: DailyTaskAssignment[]): Promise<DailyTask[]> {
    const tasks: DailyTask[] = [];
    for (const assignment of assignments) {
      const task = await this.getTaskById(assignment.taskId);
      if (task) {
        tasks.push(task);
      }
    }
    return tasks;
  }

  /**
   * Delete today's task progress for guest/testing accounts
   *
   * This method is specifically for guest users to reset their daily tasks
   * on each login, allowing them to test the task system repeatedly.
   *
   * ⚠️ WARNING: Only use this for guest/anonymous users!
   *
   * @param userId - User ID (should be anonymous/guest user)
   * @param date - Date in YYYY-MM-DD format (defaults to today)
   * @returns Promise<boolean> - true if deleted, false if not found
   */
  async deleteTodayProgress(userId: string, date?: string): Promise<boolean> {
    try {
      const targetDate = date || getTodayDateString();
      const progressId = `${userId}_${targetDate}`;

      const progressDoc = await getDoc(doc(this.dailyTaskProgressCollection, progressId));

      if (!progressDoc.exists()) {
        console.log(`No progress found for user ${userId} on ${targetDate}`);
        return false;
      }

      // Delete the progress document
      await deleteDoc(doc(this.dailyTaskProgressCollection, progressId));

      console.log(`🧪 Guest user progress deleted for ${userId} on ${targetDate}`);
      return true;
    } catch (error) {
      console.error('Error deleting today progress:', error);
      return false;
    }
  }

}

// Export singleton instance
export const dailyTaskService = new DailyTaskService();
