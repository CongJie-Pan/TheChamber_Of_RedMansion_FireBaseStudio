/**
 * @fileOverview Task Difficulty Adapter - Adaptive Learning System
 *
 * This module provides intelligent difficulty adaptation based on user performance.
 * It implements adaptive learning principles to optimize task difficulty for
 * maximum engagement and learning effectiveness.
 *
 * Key features:
 * - Performance-based difficulty recommendations
 * - Per-task-type difficulty tracking
 * - Adaptive difficulty progression
 * - Confidence level calculation
 * - Anti-frustration and anti-boredom mechanisms
 *
 * @phase Phase 1.5 - Dynamic Difficulty Adaptation
 */

import {
  DailyTaskType,
  TaskDifficulty,
  TaskHistoryRecord,
  TaskStatistics,
} from './types/daily-task';

/**
 * Performance metrics for a specific task type
 */
export interface TaskTypePerformance {
  taskType: DailyTaskType;
  averageScore: number;
  completedCount: number;
  currentDifficulty: TaskDifficulty;
  recommendedDifficulty: TaskDifficulty;
  confidenceLevel: number; // 0-100: User's mastery confidence
  trendDirection: 'improving' | 'stable' | 'declining';
}

/**
 * Difficulty recommendation result
 */
export interface DifficultyRecommendation {
  recommended: TaskDifficulty;
  reason: string;
  confidenceLevel: number;
  shouldIncrease: boolean;
  shouldDecrease: boolean;
  performanceSummary: string;
}

/**
 * Adaptive difficulty configuration
 */
const DIFFICULTY_ADAPTATION_CONFIG = {
  // Score thresholds for difficulty adjustment
  INCREASE_THRESHOLD: 85, // Increase difficulty if avg score > 85
  DECREASE_THRESHOLD: 60, // Decrease difficulty if avg score < 60
  STABLE_RANGE: [65, 80], // Ideal performance range

  // Minimum tasks before adapting difficulty
  MIN_TASKS_FOR_ADAPTATION: 3,

  // Confidence level weights
  CONFIDENCE_SCORE_WEIGHT: 0.7, // 70% weight on average score
  CONFIDENCE_CONSISTENCY_WEIGHT: 0.3, // 30% weight on score variance

  // Performance trend calculation
  RECENT_TASKS_WINDOW: 5, // Number of recent tasks to analyze for trends

  // Anti-frustration safeguards
  MAX_DIFFICULTY_JUMP: 1, // Can only increase/decrease by 1 level at a time
  CONSECUTIVE_FAILURES_THRESHOLD: 3, // Auto-decrease after 3 consecutive low scores
} as const;

/**
 * Task Difficulty Adapter Class
 * Provides intelligent difficulty adaptation based on user performance
 */
export class TaskDifficultyAdapter {
  /**
   * Analyze user performance for a specific task type
   *
   * @param taskType - Type of task to analyze
   * @param history - User's task completion history
   * @param currentDifficulty - Current difficulty level
   * @returns Performance analysis for the task type
   */
  analyzePerformance(
    taskType: DailyTaskType,
    history: TaskHistoryRecord[],
    currentDifficulty: TaskDifficulty
  ): TaskTypePerformance {
    // Filter history for this task type
    const typeHistory = history.filter((h) => h.taskType === taskType);

    if (typeHistory.length === 0) {
      // No history - return defaults
      return {
        taskType,
        averageScore: 0,
        completedCount: 0,
        currentDifficulty,
        recommendedDifficulty: currentDifficulty,
        confidenceLevel: 0,
        trendDirection: 'stable',
      };
    }

    // Calculate average score
    const averageScore =
      typeHistory.reduce((sum, h) => sum + h.score, 0) / typeHistory.length;

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidenceLevel(typeHistory);

    // Analyze trend direction
    const trendDirection = this.analyzeTrend(typeHistory);

    // Recommend difficulty
    const recommendedDifficulty = this.recommendDifficulty(
      taskType,
      typeHistory,
      currentDifficulty,
      averageScore,
      trendDirection
    );

    return {
      taskType,
      averageScore,
      completedCount: typeHistory.length,
      currentDifficulty,
      recommendedDifficulty,
      confidenceLevel,
      trendDirection,
    };
  }

  /**
   * Get difficulty recommendation for a task type
   *
   * @param taskType - Type of task
   * @param history - User's task history
   * @param currentDifficulty - Current difficulty level
   * @returns Detailed difficulty recommendation
   */
  getDifficultyRecommendation(
    taskType: DailyTaskType,
    history: TaskHistoryRecord[],
    currentDifficulty: TaskDifficulty
  ): DifficultyRecommendation {
    const performance = this.analyzePerformance(taskType, history, currentDifficulty);

    const shouldIncrease =
      this.shouldIncreaseDifficulty(performance);
    const shouldDecrease =
      this.shouldDecreaseDifficulty(performance);

    const reason = this.generateRecommendationReason(
      performance,
      shouldIncrease,
      shouldDecrease
    );

    const performanceSummary = this.generatePerformanceSummary(performance);

    return {
      recommended: performance.recommendedDifficulty,
      reason,
      confidenceLevel: performance.confidenceLevel,
      shouldIncrease,
      shouldDecrease,
      performanceSummary,
    };
  }

  /**
   * Get recommended difficulty for next task
   * Considers user level, performance history, and adaptive learning principles
   *
   * @param userLevel - User's current level
   * @param taskType - Type of task to generate
   * @param history - User's task history
   * @returns Recommended difficulty level
   */
  getAdaptiveDifficulty(
    userLevel: number,
    taskType: DailyTaskType,
    history: TaskHistoryRecord[]
  ): TaskDifficulty {
    // Start with base difficulty from user level
    const baseDifficulty = this.getBaseDifficultyFromLevel(userLevel);

    // If insufficient history, use base difficulty
    const typeHistory = history.filter((h) => h.taskType === taskType);
    if (typeHistory.length < DIFFICULTY_ADAPTATION_CONFIG.MIN_TASKS_FOR_ADAPTATION) {
      return baseDifficulty;
    }

    // Analyze performance and get recommendation
    const performance = this.analyzePerformance(taskType, typeHistory, baseDifficulty);

    return performance.recommendedDifficulty;
  }

  /**
   * Calculate confidence level (0-100) based on performance consistency
   */
  private calculateConfidenceLevel(history: TaskHistoryRecord[]): number {
    if (history.length === 0) return 0;

    // Calculate average score
    const averageScore =
      history.reduce((sum, h) => sum + h.score, 0) / history.length;

    // Calculate score variance (consistency measure)
    const variance =
      history.reduce((sum, h) => sum + Math.pow(h.score - averageScore, 2), 0) /
      history.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower variance = higher consistency = higher confidence
    const consistencyScore = Math.max(0, 100 - standardDeviation);

    // Weighted confidence: 70% average score, 30% consistency
    const confidence =
      averageScore * DIFFICULTY_ADAPTATION_CONFIG.CONFIDENCE_SCORE_WEIGHT +
      consistencyScore * DIFFICULTY_ADAPTATION_CONFIG.CONFIDENCE_CONSISTENCY_WEIGHT;

    return Math.round(Math.max(0, Math.min(100, confidence)));
  }

  /**
   * Analyze performance trend (improving/stable/declining)
   */
  private analyzeTrend(
    history: TaskHistoryRecord[]
  ): 'improving' | 'stable' | 'declining' {
    if (history.length < 3) return 'stable';

    // Get recent tasks (up to 5 most recent)
    const recentCount = Math.min(
      DIFFICULTY_ADAPTATION_CONFIG.RECENT_TASKS_WINDOW,
      history.length
    );
    const recentTasks = history.slice(-recentCount);

    // Calculate average of first half vs second half
    const midpoint = Math.floor(recentTasks.length / 2);
    const firstHalf = recentTasks.slice(0, midpoint);
    const secondHalf = recentTasks.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, h) => sum + h.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.score, 0) / secondHalf.length;

    const improvement = secondAvg - firstAvg;

    if (improvement > 10) return 'improving';
    if (improvement < -10) return 'declining';
    return 'stable';
  }

  /**
   * Recommend difficulty based on performance analysis
   */
  private recommendDifficulty(
    taskType: DailyTaskType,
    history: TaskHistoryRecord[],
    currentDifficulty: TaskDifficulty,
    averageScore: number,
    trend: 'improving' | 'stable' | 'declining'
  ): TaskDifficulty {
    // Check for consecutive failures (anti-frustration)
    if (this.hasConsecutiveFailures(history)) {
      return this.decreaseDifficulty(currentDifficulty);
    }

    // Too easy - increase difficulty
    if (averageScore >= DIFFICULTY_ADAPTATION_CONFIG.INCREASE_THRESHOLD && trend !== 'declining') {
      return this.increaseDifficulty(currentDifficulty);
    }

    // Too hard - decrease difficulty
    if (averageScore <= DIFFICULTY_ADAPTATION_CONFIG.DECREASE_THRESHOLD && trend !== 'improving') {
      return this.decreaseDifficulty(currentDifficulty);
    }

    // In optimal range - keep current difficulty
    return currentDifficulty;
  }

  /**
   * Check if user has consecutive failures (scores < 60)
   */
  private hasConsecutiveFailures(history: TaskHistoryRecord[]): boolean {
    if (history.length < DIFFICULTY_ADAPTATION_CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
      return false;
    }

    const recentTasks = history.slice(-DIFFICULTY_ADAPTATION_CONFIG.CONSECUTIVE_FAILURES_THRESHOLD);
    return recentTasks.every((h) => h.score < 60);
  }

  /**
   * Increase difficulty by one level (with safeguards)
   */
  private increaseDifficulty(current: TaskDifficulty): TaskDifficulty {
    switch (current) {
      case TaskDifficulty.EASY:
        return TaskDifficulty.MEDIUM;
      case TaskDifficulty.MEDIUM:
        return TaskDifficulty.HARD;
      case TaskDifficulty.HARD:
        return TaskDifficulty.HARD; // Already at max
      default:
        return current;
    }
  }

  /**
   * Decrease difficulty by one level (with safeguards)
   */
  private decreaseDifficulty(current: TaskDifficulty): TaskDifficulty {
    switch (current) {
      case TaskDifficulty.HARD:
        return TaskDifficulty.MEDIUM;
      case TaskDifficulty.MEDIUM:
        return TaskDifficulty.EASY;
      case TaskDifficulty.EASY:
        return TaskDifficulty.EASY; // Already at min
      default:
        return current;
    }
  }

  /**
   * Get base difficulty from user level
   */
  private getBaseDifficultyFromLevel(userLevel: number): TaskDifficulty {
    if (userLevel >= 6) return TaskDifficulty.HARD;
    if (userLevel >= 3) return TaskDifficulty.MEDIUM;
    return TaskDifficulty.EASY;
  }

  /**
   * Check if difficulty should be increased
   */
  private shouldIncreaseDifficulty(performance: TaskTypePerformance): boolean {
    return (
      performance.averageScore >= DIFFICULTY_ADAPTATION_CONFIG.INCREASE_THRESHOLD &&
      performance.trendDirection !== 'declining' &&
      performance.currentDifficulty !== TaskDifficulty.HARD &&
      performance.completedCount >= DIFFICULTY_ADAPTATION_CONFIG.MIN_TASKS_FOR_ADAPTATION
    );
  }

  /**
   * Check if difficulty should be decreased
   */
  private shouldDecreaseDifficulty(performance: TaskTypePerformance): boolean {
    return (
      (performance.averageScore <= DIFFICULTY_ADAPTATION_CONFIG.DECREASE_THRESHOLD &&
        performance.trendDirection !== 'improving') ||
      (performance.currentDifficulty !== TaskDifficulty.EASY &&
        performance.completedCount >= DIFFICULTY_ADAPTATION_CONFIG.MIN_TASKS_FOR_ADAPTATION)
    );
  }

  /**
   * Generate human-readable recommendation reason
   */
  private generateRecommendationReason(
    performance: TaskTypePerformance,
    shouldIncrease: boolean,
    shouldDecrease: boolean
  ): string {
    if (performance.completedCount < DIFFICULTY_ADAPTATION_CONFIG.MIN_TASKS_FOR_ADAPTATION) {
      return `需要完成至少 ${DIFFICULTY_ADAPTATION_CONFIG.MIN_TASKS_FOR_ADAPTATION} 個任務才能進行難度調整。`;
    }

    if (shouldIncrease) {
      return `您的表現優異（平均分數 ${performance.averageScore.toFixed(1)}），建議提升難度以保持挑戰性。`;
    }

    if (shouldDecrease) {
      return `您的分數偏低（平均分數 ${performance.averageScore.toFixed(1)}），建議降低難度以提升學習體驗。`;
    }

    return `您的表現穩定（平均分數 ${performance.averageScore.toFixed(1)}），維持當前難度最合適。`;
  }

  /**
   * Generate performance summary text
   */
  private generatePerformanceSummary(performance: TaskTypePerformance): string {
    const trendText = {
      improving: '進步中 📈',
      stable: '穩定 ➡️',
      declining: '下降中 📉',
    }[performance.trendDirection];

    return `已完成 ${performance.completedCount} 次，平均分數 ${performance.averageScore.toFixed(1)}，信心指數 ${performance.confidenceLevel}%，趨勢：${trendText}`;
  }

  /**
   * Get all task types performance summary
   *
   * @param history - Complete user task history
   * @param currentLevel - User's current level
   * @returns Performance analysis for all task types
   */
  getAllTaskTypesPerformance(
    history: TaskHistoryRecord[],
    currentLevel: number
  ): Record<DailyTaskType, TaskTypePerformance> {
    const result: Partial<Record<DailyTaskType, TaskTypePerformance>> = {};

    Object.values(DailyTaskType).forEach((taskType) => {
      const currentDifficulty = this.getBaseDifficultyFromLevel(currentLevel);
      result[taskType] = this.analyzePerformance(taskType, history, currentDifficulty);
    });

    return result as Record<DailyTaskType, TaskTypePerformance>;
  }

  /**
   * Get overall learning progress summary
   *
   * @param history - Complete user task history
   * @param statistics - User task statistics
   * @returns Learning progress summary
   */
  getOverallProgress(
    history: TaskHistoryRecord[],
    statistics: TaskStatistics
  ): {
    overallConfidence: number;
    strongestTaskType: DailyTaskType | null;
    weakestTaskType: DailyTaskType | null;
    overallTrend: 'improving' | 'stable' | 'declining';
    recommendedFocus: DailyTaskType[];
  } {
    if (history.length === 0) {
      return {
        overallConfidence: 0,
        strongestTaskType: null,
        weakestTaskType: null,
        overallTrend: 'stable',
        recommendedFocus: [],
      };
    }

    // Calculate overall confidence from average score
    const overallConfidence = Math.round(statistics.averageScore);

    // Find strongest and weakest task types
    let strongestType: DailyTaskType | null = null;
    let weakestType: DailyTaskType | null = null;
    let highestScore = 0;
    let lowestScore = 100;

    Object.entries(statistics.byType).forEach(([type, stats]) => {
      if (stats.averageScore > highestScore) {
        highestScore = stats.averageScore;
        strongestType = type as DailyTaskType;
      }
      if (stats.averageScore < lowestScore) {
        lowestScore = stats.averageScore;
        weakestType = type as DailyTaskType;
      }
    });

    // Analyze overall trend
    const overallTrend = this.analyzeTrend(history);

    // Recommend focus areas (task types with lowest scores)
    const recommendedFocus = Object.entries(statistics.byType)
      .filter(([_, stats]) => stats.averageScore < 70)
      .map(([type]) => type as DailyTaskType);

    return {
      overallConfidence,
      strongestTaskType: strongestType,
      weakestTaskType: weakestType,
      overallTrend,
      recommendedFocus,
    };
  }
}

/**
 * Export singleton instance
 */
export const taskDifficultyAdapter = new TaskDifficultyAdapter();
