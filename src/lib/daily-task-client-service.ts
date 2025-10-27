/**
 * @fileOverview Daily Task Client Service
 *
 * Client-side service for daily task operations.
 * This service uses HTTP API calls instead of direct database access,
 * avoiding the need to load SQLite modules in the browser environment.
 *
 * Key features:
 * - Fetch user's daily task progress
 * - Retrieve task completion history
 * - Submit task answers
 * - Client-side error handling and logging
 *
 * Usage:
 * ```typescript
 * import { dailyTaskClientService } from '@/lib/daily-task-client-service';
 *
 * const progress = await dailyTaskClientService.getUserDailyProgress(userId);
 * const history = await dailyTaskClientService.getTaskHistory(userId);
 * ```
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

import type { DailyTaskProgress } from './types/daily-task';

/**
 * Daily Task Client Service
 *
 * Provides client-side access to daily task functionality via API calls
 */
export const dailyTaskClientService = {
  /**
   * Get user's current daily task progress
   *
   * @param userId - User ID to fetch progress for
   * @returns DailyTaskProgress object or null if no progress exists
   */
  getUserDailyProgress: async (userId: string): Promise<DailyTaskProgress | null> => {
    try {
      console.log(`📊 [Client Service] Fetching daily progress for user: ${userId}`);

      const response = await fetch(`/api/daily-tasks/progress?userId=${encodeURIComponent(userId)}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch progress');
      }

      const progress = await response.json();

      console.log(`✅ [Client Service] Progress fetched successfully`);

      return progress;
    } catch (error) {
      console.error('❌ [Client Service] Error fetching daily progress:', error);
      return null;
    }
  },

  /**
   * Get user's task completion history
   *
   * @param userId - User ID to fetch history for
   * @param limit - Maximum number of history entries to return (default: 100)
   * @returns Array of DailyTaskProgress objects representing historical progress
   */
  getTaskHistory: async (userId: string, limit: number = 100): Promise<DailyTaskProgress[]> => {
    try {
      console.log(`📚 [Client Service] Fetching task history for user: ${userId}, limit: ${limit}`);

      const response = await fetch(
        `/api/daily-tasks/history?userId=${encodeURIComponent(userId)}&limit=${limit}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch history');
      }

      const history = await response.json();

      console.log(`✅ [Client Service] History fetched: ${history.length} entries`);

      return history;
    } catch (error) {
      console.error('❌ [Client Service] Error fetching task history:', error);
      return [];
    }
  },

  /**
   * Submit task answer
   *
   * Uses the existing /api/daily-tasks/submit endpoint
   *
   * @param userId - User ID submitting the answer
   * @param taskId - Task ID being completed
   * @param userAnswer - User's answer text
   * @returns Submission result with score and feedback
   */
  submitTaskAnswer: async (userId: string, taskId: string, userAnswer: string) => {
    try {
      console.log(`✍️ [Client Service] Submitting answer for task: ${taskId}`);

      const response = await fetch('/api/daily-tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          taskId,
          userAnswer,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit answer');
      }

      const result = await response.json();

      console.log(`✅ [Client Service] Answer submitted successfully, score: ${result.score}`);

      return result;
    } catch (error) {
      console.error('❌ [Client Service] Error submitting answer:', error);
      throw error;
    }
  },

  /**
   * Generate daily tasks for user
   *
   * Uses the existing /api/daily-tasks/generate endpoint
   *
   * @param userId - User ID to generate tasks for
   * @returns Generated tasks result
   */
  generateDailyTasks: async (userId: string) => {
    try {
      console.log(`🎲 [Client Service] Generating daily tasks for user: ${userId}`);

      const response = await fetch('/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate tasks');
      }

      const result = await response.json();

      console.log(`✅ [Client Service] Tasks generated successfully`);

      return result;
    } catch (error) {
      console.error('❌ [Client Service] Error generating tasks:', error);
      throw error;
    }
  },
};

/**
 * Type export for convenience
 */
export type { DailyTaskProgress } from './types/daily-task';
