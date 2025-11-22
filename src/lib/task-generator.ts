/**
 * @fileOverview Daily Task Generator
 *
 * This module generates daily tasks for users based on their level and progress.
 * It ensures task variety, appropriate difficulty, and cultural/educational value.
 *
 * Generation strategy:
 * - 2 tasks per day (configurable)
 * - Difficulty adapts to user level
 * - Task types rotate to ensure variety
 * - Content sourced from Red Mansion chapters and cultural elements
 * - Phase 2.9: Enhanced with AI-powered dynamic content generation
 *
 * @phase Phase 1.4 - Task Generation Logic
 * @phase Phase 2.9.2 - AI Content Generation Integration
 */

import {
  DailyTask,
  DailyTaskType,
  TaskDifficulty,
  TextPassage,
  CharacterPrompt,
  CulturalElement,
  CommentaryContent,
  QuizQuestion,
  TaskHistoryRecord,
} from './types/daily-task';
import { AttributePoints } from './types/user-level';
import { taskDifficultyAdapter } from './task-difficulty-adapter';

// Phase 2.9: AI-powered task content generation
import {
  generateTaskContent as generateAITaskContent,
  type TaskContentGenerationParams,
} from './ai-task-content-generator';

/**
 * Task generation configuration
 */
const TASK_GENERATION_CONFIG = {
  tasksPerDay: 2, // Number of tasks generated per day
  allowDuplicateTypes: false, // Prevent same type in same day
  varietyWindowDays: 7, // Avoid repeating same task within 7 days

  // Task type weights (probability distribution)
  typeWeights: {
    [DailyTaskType.MORNING_READING]: 25,
    [DailyTaskType.CHARACTER_INSIGHT]: 25,
    [DailyTaskType.CULTURAL_EXPLORATION]: 25,
    [DailyTaskType.COMMENTARY_DECODE]: 25,
  },

  // Difficulty mapping by user level
  difficultyByLevel: {
    [TaskDifficulty.EASY]: [0, 1, 2], // Levels 0-2
    [TaskDifficulty.MEDIUM]: [3, 4, 5], // Levels 3-5
    [TaskDifficulty.HARD]: [6, 7], // Levels 6-7
  },
} as const;

/**
 * XP rewards by task type and difficulty
 * Exported for use in task-repository.ts rowToTask() conversion
 */
export const XP_REWARD_TABLE: Record<DailyTaskType, Record<TaskDifficulty, number>> = {
  [DailyTaskType.MORNING_READING]: {
    [TaskDifficulty.EASY]: 8,
    [TaskDifficulty.MEDIUM]: 12,
    [TaskDifficulty.HARD]: 16,
  },
  [DailyTaskType.CHARACTER_INSIGHT]: {
    [TaskDifficulty.EASY]: 10,
    [TaskDifficulty.MEDIUM]: 15,
    [TaskDifficulty.HARD]: 20,
  },
  [DailyTaskType.CULTURAL_EXPLORATION]: {
    [TaskDifficulty.EASY]: 12,
    [TaskDifficulty.MEDIUM]: 18,
    [TaskDifficulty.HARD]: 24,
  },
  [DailyTaskType.COMMENTARY_DECODE]: {
    [TaskDifficulty.EASY]: 14,
    [TaskDifficulty.MEDIUM]: 21,
    [TaskDifficulty.HARD]: 28,
  },
};

/**
 * Attribute rewards by task type
 * Aligned with user-level.ts AttributePoints interface
 * Exported for use in task-repository.ts rowToTask() conversion
 */
export const ATTRIBUTE_REWARD_TABLE: Record<DailyTaskType, Partial<AttributePoints>> = {
  [DailyTaskType.MORNING_READING]: {
    analyticalThinking: 1,
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
 * Daily Task Generator Class
 */
export class TaskGenerator {
  /**
   * Generate daily tasks for a user
   *
   * Phase 4.1.1: Includes weekday-based task type rotation
   * Phase 4.1.2: Includes adaptive difficulty based on historical performance
   * Phase 2.9.2: Enhanced with AI-powered content generation
   *
   * @param userId - User ID
   * @param userLevel - User's current level
   * @param date - Date string for task generation
   * @param recentTaskIds - Recent task IDs (for variety)
   * @param taskHistory - User's task history (for adaptive difficulty and AI content)
   */
  async generateTasksForUser(
    userId: string,
    userLevel: number,
    date: string,
    recentTaskIds?: string[],
    taskHistory?: TaskHistoryRecord[]
  ): Promise<DailyTask[]> {
    // Select task types with weekday-based weighting
    const taskTypes = this.selectTaskTypes(recentTaskIds, date);

    const tasks: DailyTask[] = [];

    for (const taskType of taskTypes) {
      // Determine difficulty using adaptive system if history is available
      let difficulty: TaskDifficulty;

      if (taskHistory && taskHistory.length >= 3) {
        // Use adaptive difficulty based on performance
        difficulty = taskDifficultyAdapter.getAdaptiveDifficulty(
          userLevel,
          taskType,
          taskHistory
        );
      } else {
        // Fall back to level-based difficulty for new users
        difficulty = this.determineDifficulty(userLevel);
      }

      // Phase 2.9.2: Generate task with AI-powered content
      const task = await this.generateTask(
        taskType,
        difficulty,
        date,
        userLevel,
        taskHistory
      );
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Determine difficulty based on user level
   */
  private determineDifficulty(userLevel: number): TaskDifficulty {
    if (userLevel >= 6) return TaskDifficulty.HARD;
    if (userLevel >= 3) return TaskDifficulty.MEDIUM;
    return TaskDifficulty.EASY;
  }

  /**
   * Select task types ensuring variety with weekday-based rotation
   *
   * Weekday Strategy (Phase 4.1.1):
   * - Monday: Boost MORNING_READING (fresh start, easier reentry)
   * - Wednesday: Boost CHARACTER_INSIGHT (mid-week reflection)
   * - Friday: Boost POETRY (aesthetic appreciation before weekend)
   * - Weekend: Boost CULTURAL_EXPLORATION (deeper learning with more time)
   * - Other days: Standard weight distribution
   */
  private selectTaskTypes(recentTaskIds?: string[], date?: string): DailyTaskType[] {
    const availableTypes = Object.keys(DailyTaskType) as DailyTaskType[];
    const selectedTypes: DailyTaskType[] = [];

    // Get day of week from date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dateObj = date ? new Date(date) : new Date();
    const dayOfWeek = dateObj.getDay();

    // Apply weekday-based weight adjustments
    const adjustedWeights = this.getWeekdayAdjustedWeights(dayOfWeek);

    // Weighted random selection with weekday adjustments
    for (let i = 0; i < TASK_GENERATION_CONFIG.tasksPerDay; i++) {
      const type = this.weightedRandomType(selectedTypes, adjustedWeights);
      selectedTypes.push(type);
    }

    return selectedTypes;
  }

  /**
   * Get weekday-adjusted task type weights
   * Boosts specific task types based on the day of the week
   */
  private getWeekdayAdjustedWeights(dayOfWeek: number): Record<DailyTaskType, number> {
    // Clone base weights
    const weights = { ...TASK_GENERATION_CONFIG.typeWeights };

    // Apply weekday multipliers (1.5x boost for featured type)
    switch (dayOfWeek) {
      case 1: // Monday - Fresh start
        weights[DailyTaskType.MORNING_READING] *= 1.5;
        break;
      case 3: // Wednesday - Mid-week reflection
        weights[DailyTaskType.CHARACTER_INSIGHT] *= 1.5;
        break;
      case 5: // Friday - Deep learning
        weights[DailyTaskType.COMMENTARY_DECODE] *= 1.5;
        break;
      case 0: // Sunday - Deep learning
      case 6: // Saturday - Deep learning
        weights[DailyTaskType.CULTURAL_EXPLORATION] *= 1.5;
        break;
      // Tuesday (2) and Thursday (4) use standard weights
    }

    return weights;
  }

  /**
   * Weighted random type selection
   *
   * @param excludeTypes - Task types to exclude from selection
   * @param customWeights - Optional custom weights (used for weekday adjustments)
   */
  private weightedRandomType(
    excludeTypes: DailyTaskType[] = [],
    customWeights?: Record<DailyTaskType, number>
  ): DailyTaskType {
    const weights = customWeights || TASK_GENERATION_CONFIG.typeWeights;
    const availableTypes = Object.keys(weights).filter(
      (type) => !excludeTypes.includes(type as DailyTaskType)
    ) as DailyTaskType[];

    const totalWeight = availableTypes.reduce(
      (sum, type) => sum + weights[type],
      0
    );

    let random = Math.random() * totalWeight;

    for (const type of availableTypes) {
      random -= weights[type];
      if (random <= 0) return type;
    }

    return availableTypes[0]; // Fallback
  }

  /**
   * Generate a single task
   * Phase 2.9.2: Enhanced with AI-powered content generation
   */
  private async generateTask(
    type: DailyTaskType,
    difficulty: TaskDifficulty,
    date: string,
    userLevel?: number,
    taskHistory?: TaskHistoryRecord[]
  ): Promise<DailyTask> {
    const taskId = this.generateTaskId(type, difficulty, date);

    // Phase 2.9.2: Generate type-specific content with optional AI generation
    const content = await this.generateTaskContent(
      type,
      difficulty,
      userLevel,
      taskHistory
    );

    // Generate sourceId based on content (Phase 4.4: Anti-farming)
    const sourceId = this.generateSourceId(type, content);

    const baseTask: Omit<DailyTask, 'content'> = {
      id: taskId,
      type,
      difficulty,
      title: this.getTaskTitle(type, difficulty),
      description: this.getTaskDescription(type, difficulty),
      timeEstimate: this.getTimeEstimate(type),
      xpReward: XP_REWARD_TABLE[type][difficulty],
      attributeRewards: ATTRIBUTE_REWARD_TABLE[type],
      sourceId, // Phase 4.4: Unique content identifier
      gradingCriteria: this.getGradingCriteria(type, difficulty),
    };

    return { ...baseTask, content };
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(
    type: DailyTaskType,
    difficulty: TaskDifficulty,
    date: string
  ): string {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${difficulty}_${date}_${random}_${timestamp}`;
  }

  /**
   * Generate source ID for anti-farming (Phase 4.4)
   * Creates a unique identifier based on content source
   *
   * Purpose: Prevents users from completing the same content multiple times
   * for duplicate XP rewards
   *
   * @param type - Task type
   * @param content - Task content
   * @returns Unique source identifier
   */
  private generateSourceId(type: DailyTaskType, content: DailyTask['content']): string {
    switch (type) {
      case DailyTaskType.MORNING_READING: {
        const passage = content.textPassage;
        if (!passage) return `unknown-passage-${Date.now()}`;
        return `chapter-${passage.chapter}-passage-${passage.startLine}-${passage.endLine}`;
      }

      case DailyTaskType.CHARACTER_INSIGHT: {
        const character = content.character;
        if (!character) return `unknown-character-${Date.now()}`;
        const chapterStr = character.chapter ? `-chapter-${character.chapter}` : '-general';
        return `character-${character.characterId}${chapterStr}`;
      }

      case DailyTaskType.CULTURAL_EXPLORATION: {
        const cultural = content.culturalElement;
        if (!cultural) return `unknown-cultural-${Date.now()}`;
        return `culture-${cultural.id}`;
      }

      case DailyTaskType.COMMENTARY_DECODE: {
        const commentary = content.commentary;
        if (!commentary) return `unknown-commentary-${Date.now()}`;
        return `commentary-${commentary.id}`;
      }

      default:
        return `unknown-${type}-${Date.now()}`;
    }
  }

  /**
   * Get localized task title
   */
  private getTaskTitle(type: DailyTaskType, difficulty: TaskDifficulty): string {
    const titles: Record<DailyTaskType, Record<TaskDifficulty, string>> = {
      [DailyTaskType.MORNING_READING]: {
        [TaskDifficulty.EASY]: '晨讀時光 - 初探紅樓',
        [TaskDifficulty.MEDIUM]: '晨讀時光 - 深入紅樓',
        [TaskDifficulty.HARD]: '晨讀時光 - 透析紅樓',
      },
      [DailyTaskType.CHARACTER_INSIGHT]: {
        [TaskDifficulty.EASY]: '人物洞察 - 性格初識',
        [TaskDifficulty.MEDIUM]: '人物洞察 - 關係剖析',
        [TaskDifficulty.HARD]: '人物洞察 - 命運探究',
      },
      [DailyTaskType.CULTURAL_EXPLORATION]: {
        [TaskDifficulty.EASY]: '文化探秘 - 傳統啟蒙',
        [TaskDifficulty.MEDIUM]: '文化探秘 - 禮儀深究',
        [TaskDifficulty.HARD]: '文化探秘 - 文化通論',
      },
      [DailyTaskType.COMMENTARY_DECODE]: {
        [TaskDifficulty.EASY]: '脂批解密 - 批語入門',
        [TaskDifficulty.MEDIUM]: '脂批解密 - 隱喻解析',
        [TaskDifficulty.HARD]: '脂批解密 - 玄機探索',
      },
    };

    return titles[type][difficulty];
  }

  /**
   * Get task description
   */
  private getTaskDescription(type: DailyTaskType, difficulty: TaskDifficulty): string {
    const descriptions: Record<DailyTaskType, string> = {
      [DailyTaskType.MORNING_READING]: '閱讀《紅樓夢》精選段落，理解文本深意，培養古典文學鑒賞能力。',
      [DailyTaskType.CHARACTER_INSIGHT]: '分析紅樓人物性格特點與命運走向，洞察人性與社會。',
      [DailyTaskType.CULTURAL_EXPLORATION]: '探索紅樓中的傳統文化元素，了解古代禮儀、服飾、建築等知識。',
      [DailyTaskType.COMMENTARY_DECODE]: '解讀脂硯齋批語，發現隱藏的文本線索與創作意圖。',
    };

    return descriptions[type];
  }

  /**
   * Get time estimate for task type
   */
  private getTimeEstimate(type: DailyTaskType): number {
    const estimates: Record<DailyTaskType, number> = {
      [DailyTaskType.MORNING_READING]: 5,
      [DailyTaskType.CHARACTER_INSIGHT]: 5,
      [DailyTaskType.CULTURAL_EXPLORATION]: 10,
      [DailyTaskType.COMMENTARY_DECODE]: 8,
    };

    return estimates[type];
  }

  /**
   * Get grading criteria for task type
   */
  private getGradingCriteria(type: DailyTaskType, difficulty: TaskDifficulty) {
    const baseCriteria = {
      minLength: difficulty === TaskDifficulty.HARD ? 100 : difficulty === TaskDifficulty.MEDIUM ? 50 : 30,
      maxLength: 500,
    };

    switch (type) {
      case DailyTaskType.MORNING_READING:
        return {
          ...baseCriteria,
          requiredKeywords: [],
          evaluationPrompt: '評估用戶對文本的理解深度、關鍵情節的把握以及個人見解的獨特性。',
          rubric: {
            accuracy: 30,
            depth: 30,
            insight: 25,
            completeness: 15,
          },
        };

      case DailyTaskType.CHARACTER_INSIGHT:
        return {
          ...baseCriteria,
          evaluationPrompt: '評估用戶對人物性格的分析、關係網絡的理解以及命運走向的洞察。',
          rubric: {
            accuracy: 20,
            depth: 35,
            insight: 30,
            completeness: 15,
          },
        };

      case DailyTaskType.CULTURAL_EXPLORATION:
        return {
          ...baseCriteria,
          evaluationPrompt: '評估用戶對文化知識的掌握、歷史背景的理解以及與現代的關聯思考。',
          rubric: {
            accuracy: 40,
            depth: 25,
            insight: 20,
            completeness: 15,
          },
        };

      case DailyTaskType.COMMENTARY_DECODE:
        return {
          ...baseCriteria,
          evaluationPrompt: '評估用戶對脂批含義的解讀、隱喻的發現以及作者意圖的推測。',
          rubric: {
            accuracy: 25,
            depth: 30,
            insight: 35,
            completeness: 10,
          },
        };

      default:
        return baseCriteria;
    }
  }

  /**
   * Generate task-specific content
   * Phase 2.9.2: Enhanced with AI-powered content generation
   */
  private async generateTaskContent(
    type: DailyTaskType,
    difficulty: TaskDifficulty,
    userLevel?: number,
    taskHistory?: TaskHistoryRecord[]
  ): Promise<DailyTask['content']> {
    // Phase 2.9.2: Try AI-powered content generation first
    if (userLevel !== undefined) {
      try {
        const aiContent = await this.tryGenerateAIContent(
          type,
          difficulty,
          userLevel,
          taskHistory
        );

        if (aiContent) {
          console.log(`✅ Using AI-generated content for ${type}`);
          return aiContent;
        }
      } catch (error) {
        console.warn(`⚠️ AI content generation failed, using hardcoded content:`, error);
      }
    }

    // Fallback to hardcoded content generation
    return this.generateHardcodedContent(type, difficulty);
  }

  /**
   * Try to generate content using AI
   * Phase 2.9.2: AI-powered content generation
   */
  private async tryGenerateAIContent(
    type: DailyTaskType,
    difficulty: TaskDifficulty,
    userLevel: number,
    taskHistory?: TaskHistoryRecord[]
  ): Promise<DailyTask['content'] | null> {
    try {
      // Extract recent chapters from task history
      const recentChapters: number[] = [];
      if (taskHistory) {
        for (const record of taskHistory.slice(-5)) {
          // Last 5 tasks
          const sourceId = record.taskType === type ? record.sourceId : undefined;
          if (sourceId && sourceId.includes('chapter-')) {
            const match = sourceId.match(/chapter-(\d+)/);
            if (match) {
              recentChapters.push(parseInt(match[1]));
            }
          }
        }
      }

      // Build AI content generation parameters
      const params: TaskContentGenerationParams = {
        userLevel,
        taskType: type,
        difficulty,
        recentChapters: recentChapters.length > 0 ? recentChapters : undefined,
        learningHistory: taskHistory
          ? {
              completedTaskTypes: taskHistory.map((t) => t.taskType),
              averageScores: this.calculateAverageScores(taskHistory),
            }
          : undefined,
      };

      // Generate content using AI
      const aiGeneratedContent = await generateAITaskContent(params);

      return aiGeneratedContent;
    } catch (error) {
      console.error('❌ Failed to generate AI content:', error);
      return null;
    }
  }

  /**
   * Calculate average scores by task type from history
   */
  private calculateAverageScores(
    taskHistory: TaskHistoryRecord[]
  ): Record<DailyTaskType, number> {
    const scores: Record<string, number[]> = {};

    for (const record of taskHistory) {
      if (!scores[record.taskType]) {
        scores[record.taskType] = [];
      }
      scores[record.taskType].push(record.score);
    }

    const averages: Partial<Record<DailyTaskType, number>> = {};
    for (const [taskType, scoreArray] of Object.entries(scores)) {
      const sum = scoreArray.reduce((a, b) => a + b, 0);
      averages[taskType as DailyTaskType] = Math.round(sum / scoreArray.length);
    }

    return averages as Record<DailyTaskType, number>;
  }

  /**
   * Generate hardcoded content (fallback)
   * Phase 2.9.2: Extracted from original generateTaskContent
   */
  private generateHardcodedContent(
    type: DailyTaskType,
    difficulty: TaskDifficulty
  ): DailyTask['content'] {
    switch (type) {
      case DailyTaskType.MORNING_READING:
        return { textPassage: this.generateMorningReadingContent(difficulty) };

      case DailyTaskType.CHARACTER_INSIGHT:
        return { character: this.generateCharacterContent(difficulty) };

      case DailyTaskType.CULTURAL_EXPLORATION:
        return { culturalElement: this.generateCulturalContent(difficulty) };

      case DailyTaskType.COMMENTARY_DECODE:
        return { commentary: this.generateCommentaryContent(difficulty) };

      default:
        return {};
    }
  }

  /**
   * Generate morning reading content
   */
  private generateMorningReadingContent(difficulty: TaskDifficulty): TextPassage {
    // Sample passages from different chapters
    const passages: Record<TaskDifficulty, TextPassage> = {
      [TaskDifficulty.EASY]: {
        chapter: 3,
        startLine: 1,
        endLine: 10,
        text: '卻說黛玉自那日棄舟登岸時，便有榮國府打發了轎子並拉行李的車輛久候了。這林黛玉常聽得母親說過，他外祖母家與別家不同。他近日所見的這幾個三等僕婦，吃穿用度，已是不凡了，何況今至其家。因此步步留心，時時在意，不肯輕易多說一句話，多行一步路，惟恐被人恥笑了他去。',
        question: '從這段文字中，你認為林黛玉初到賈府時的心理狀態是什麼？她為什麼會有這樣的心理？',
        hint: '思考提示：注意黛玉的行為描述「步步留心，時時在意」，以及她擔心「被人恥笑」的心理。想想看，她為什麼會如此小心翼翼？這反映了她什麼樣的處境？',
        expectedKeywords: ['謹慎', '小心', '拘謹', '寄人籬下', '步步留心'],
      },
      [TaskDifficulty.MEDIUM]: {
        chapter: 5,
        startLine: 1,
        endLine: 15,
        text: '賈寶玉在夢中來到了太虛幻境，警幻仙姑對他說："吾所愛汝者，乃天分中生成一段痴情。吾今日欲令汝觀看一番，警悟警悟。"遂引寶玉至一處，但見彩雲繚繞，寶氣氤氳。寶玉抬頭看時，見有一匾，上書"薄命司"三字。',
        question: '警幻仙姑為何說寶玉"天分中生成一段痴情"？這種"痴情"在後續的故事中如何體現？請結合你的閱讀經驗分析。',
        hint: '思考提示：寶玉的「痴情」不同於一般的男女之情。想想他對大觀園中女孩子們的態度，他是如何看待和對待她們的？這種情感有什麼特別之處？',
        expectedKeywords: ['多情', '癡情', '女性', '真摯', '超越世俗'],
      },
      [TaskDifficulty.HARD]: {
        chapter: 23,
        startLine: 1,
        endLine: 20,
        text: '西廂記妙詞通戲語，牡丹亭豔曲警芳心。那寶玉和黛玉二人，一個是閬苑仙葩，一個是美玉無瑕。若說沒奇緣，今生偏又遇著他；若說有奇緣，如何心事終虛化？一個枉自嗟呀，一個空勞牽掛。一個是水中月，一個是鏡中花。想眼中能有多少淚珠兒，怎經得秋流到冬盡，春流到夏！',
        question: '這段"枉凝眉"曲詞預示了寶黛愛情的悲劇性結局。請分析作者如何通過意象（水中月、鏡中花、淚珠等）來表達這種宿命感和無奈感？並探討這種悲劇性在整部小說中的意義。',
        hint: '思考提示：「水中月」和「鏡中花」都是看得見卻摸不著的意象，象徵著什麼？「枉自嗟呀」和「空勞牽掛」又說明了什麼？這些意象如何共同營造出一種無法改變的宿命感？',
        expectedKeywords: ['悲劇', '宿命', '虛幻', '不可得', '眼淚', '意象'],
      },
    };

    return passages[difficulty];
  }

  /**
   * Generate character analysis content
   */
  private generateCharacterContent(difficulty: TaskDifficulty): CharacterPrompt {
    const prompts: Record<TaskDifficulty, CharacterPrompt> = {
      [TaskDifficulty.EASY]: {
        characterId: 'daiyu',
        characterName: '林黛玉',
        analysisPrompts: [
          '林黛玉初入賈府時的性格特點是什麼？',
          '她的"小心眼"是任性還是自我保護？',
        ],
        chapter: 3,
        context: '林黛玉初入賈府',
      },
      [TaskDifficulty.MEDIUM]: {
        characterId: 'baoyu',
        characterName: '賈寶玉',
        analysisPrompts: [
          '賈寶玉對女性的態度與當時社會主流價值觀有何不同？',
          '他的"痴情"與"叛逆"之間有什麼內在聯繫？',
          '寶玉摔玉這一行為反映了他怎樣的性格？',
        ],
        chapter: 3,
        context: '寶玉初見黛玉，摔玉',
      },
      [TaskDifficulty.HARD]: {
        characterId: 'xifeng',
        characterName: '王熙鳳',
        analysisPrompts: [
          '王熙鳳的管理才能與權謀手段如何體現？',
          '她的悲劇命運是性格使然還是時代必然？',
          '分析王熙鳳"機關算盡太聰明，反算了卿卿性命"的深層含義。',
          '她與賈璉的婚姻關係折射出怎樣的社會現實？',
        ],
        chapter: 13,
        context: '協理寧國府',
      },
    };

    return prompts[difficulty];
  }

  /**
   * Generate cultural exploration content
   */
  private generateCulturalContent(difficulty: TaskDifficulty): CulturalElement {
    const elements: Record<TaskDifficulty, CulturalElement> = {
      [TaskDifficulty.EASY]: {
        id: 'culture_001',
        category: '禮儀',
        title: '古代見面禮節',
        description: '在《紅樓夢》中，人物見面時的禮節體現了嚴格的等級秩序。比如林黛玉初見賈母時的行禮方式，以及晚輩對長輩的請安問候。',
        relatedChapters: [3, 4],
        questions: [
          {
            id: 'q1',
            question: '林黛玉初見外祖母賈母時，應該行什麼禮？',
            type: 'multiple_choice',
            options: ['叩拜禮', '萬福禮', '揖禮', '鞠躬禮'],
            correctAnswer: '叩拜禮',
            explanation: '在古代，晚輩初次拜見長輩，特別是外祖母這樣的至親長輩，需要行叩拜大禮以示尊敬。',
          },
        ],
      },
      [TaskDifficulty.MEDIUM]: {
        id: 'culture_002',
        category: '服飾',
        title: '紅樓服飾之美',
        description: '《紅樓夢》對服飾的描寫極為細緻，從中可以看出古代服飾的等級制度、審美趣味和文化內涵。',
        relatedChapters: [3, 7, 49],
        questions: [
          {
            id: 'q1',
            question: '"雀金裘"是什麼材質製成的珍貴服飾？',
            type: 'short_answer',
            correctAnswer: ['孔雀毛', '金線'],
            explanation: '雀金裘是用孔雀毛和金線編織而成，極其珍貴，連一般的繡匠都不會修補。',
          },
        ],
      },
      [TaskDifficulty.HARD]: {
        id: 'culture_003',
        category: '建築',
        title: '大觀園的建築美學',
        description: '大觀園是中國古典園林藝術的集大成之作，體現了"雖由人作，宛自天開"的造園理念。',
        relatedChapters: [17, 18],
        questions: [
          {
            id: 'q1',
            question: '大觀園的設計理念體現了哪些中國傳統美學思想？請至少列舉三點並說明。',
            type: 'short_answer',
            correctAnswer: ['天人合一', '移步換景', '借景', '對稱', '含蓄'],
            explanation: '大觀園體現了天人合一（自然與人工和諧）、移步換景（遊覽路線設計）、借景（利用周邊景觀）等多種傳統美學思想。',
          },
        ],
      },
    };

    return elements[difficulty];
  }

  /**
   * Generate commentary decoding content
   */
  private generateCommentaryContent(difficulty: TaskDifficulty): CommentaryContent {
    const commentaries: Record<TaskDifficulty, CommentaryContent> = {
      [TaskDifficulty.EASY]: {
        id: 'commentary_001',
        originalText: '這個妹妹我曾見過的。',
        commentaryText: '【甲戌側批：這是第一見，卻說曾見，可知前生有緣。】',
        chapter: 3,
        author: '脂硯齋',
        hint: '這條批語點出了寶黛之間的前世因緣。',
      },
      [TaskDifficulty.MEDIUM]: {
        id: 'commentary_002',
        originalText: '賈母因問黛玉唸何書。黛玉道："剛唸了《四書》。"',
        commentaryText: '【甲戌側批：妙！黛玉是極聰明的女兒，卻偏說剛唸完《四書》，蓋恐說多了便露才，反遭人忌。真正聰明。】',
        chapter: 3,
        author: '脂硯齋',
        hint: '這條批語揭示了林黛玉的智慧：她懂得在賈府要謹言慎行，不可鋒芒畢露。',
      },
      [TaskDifficulty.HARD]: {
        id: 'commentary_003',
        originalText: '滿紙荒唐言，一把辛酸淚。都云作者痴，誰解其中味？',
        commentaryText: '【甲戌側批：此是第一首標題詩，能解者方有辛酸之淚，哭成此書。壬午除夕，書未成，芹為淚盡而逝。余嘗哭芹，淚亦待盡。每思覓青埂峰再問石兄，餘淚更有幾多，奈不遇癩頭和尚何！】',
        chapter: 1,
        author: '脂硯齋',
        hint: '這條批語透露了曹雪芹創作此書的辛酸和脂硯齋與作者的深厚情誼，也暗示了作者的早逝和全書未完成的遺憾。',
      },
    };

    return commentaries[difficulty];
  }
}

/**
 * Export singleton instance
 */
export const taskGenerator = new TaskGenerator();
