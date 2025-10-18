/**
 * @fileOverview Integration tests for Daily Task Service AI Integration
 *
 * These tests verify the integration of AI flows with DailyTaskService:
 * - Task type routing to appropriate AI flows
 * - Content extraction from task objects
 * - AI flow invocation with correct parameters
 * - Error handling and fallback scoring
 * - Score normalization (0-100 range)
 * - Graceful degradation when AI is unavailable
 *
 * The tests use mocked AI flows to avoid actual API calls.
 */

import { DailyTaskService } from '@/lib/daily-task-service';
import { DailyTask, DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

// Mock all AI flow modules
jest.mock('@/ai/flows/daily-reading-comprehension', () => ({
  assessReadingComprehension: jest.fn().mockResolvedValue({
    score: 85,
    accuracy: 90,
    completeness: 80,
    keywordsCaptured: ['寶玉', '黛玉'],
    keywordsMissed: [],
    feedback: 'Mock feedback for reading comprehension',
    detailedAnalysis: 'Mock analysis'
  })
}));

jest.mock('@/ai/flows/poetry-quality-assessment', () => ({
  assessPoetryQuality: jest.fn().mockResolvedValue({
    accuracy: 95,
    completeness: 90,
    overallScore: 92,
    mistakes: [],
    feedback: 'Mock feedback for poetry assessment',
    literaryAnalysis: 'Mock literary analysis'
  })
}));

jest.mock('@/ai/flows/character-analysis-scoring', () => ({
  scoreCharacterAnalysis: jest.fn().mockResolvedValue({
    qualityScore: 82,
    depth: 'moderate',
    insight: 75,
    themesCovered: ['性格', '命運'],
    themesMissed: [],
    feedback: 'Mock feedback for character analysis',
    detailedAnalysis: 'Mock detailed analysis'
  })
}));

jest.mock('@/ai/flows/cultural-quiz-grading', () => ({
  gradeCulturalQuiz: jest.fn().mockResolvedValue({
    score: 80,
    correctCount: 2,
    totalQuestions: 3,
    questionResults: [],
    feedback: 'Mock feedback for cultural quiz',
    culturalInsights: 'Mock cultural insights'
  })
}));

jest.mock('@/ai/flows/commentary-interpretation', () => ({
  scoreCommentaryInterpretation: jest.fn().mockResolvedValue({
    score: 78,
    insightLevel: 'moderate',
    literarySensitivity: 72,
    keyInsightsCaptured: ['伏筆'],
    keyInsightsMissed: [],
    feedback: 'Mock feedback for commentary',
    detailedAnalysis: 'Mock detailed analysis',
    commentaryExplanation: 'Mock commentary explanation'
  })
}));

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock user-level-service
jest.mock('@/lib/user-level-service', () => ({
  userLevelService: {
    getUserProfile: jest.fn(),
    awardXP: jest.fn(),
    updateAttributes: jest.fn(),
  },
}));

// Import mocked AI flows for verification
import { assessReadingComprehension } from '@/ai/flows/daily-reading-comprehension';
import { assessPoetryQuality } from '@/ai/flows/poetry-quality-assessment';
import { scoreCharacterAnalysis } from '@/ai/flows/character-analysis-scoring';
import { gradeCulturalQuiz } from '@/ai/flows/cultural-quiz-grading';
import { scoreCommentaryInterpretation } from '@/ai/flows/commentary-interpretation';

describe('Daily Task Service AI Integration Tests', () => {
  let service: DailyTaskService;

  beforeEach(() => {
    service = new DailyTaskService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreMocks();
  });

  describe('Task Type Routing', () => {
    it('should route MORNING_READING to assessReadingComprehension', async () => {
      const task: DailyTask = {
        id: 'task_morning_reading',
        type: DailyTaskType.MORNING_READING,
        title: '晨讀理解測試',
        description: '測試問題',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {
          textPassage: {
            text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來。',
            chapter: '第三回',
            question: '黛玉見到了誰？',
            expectedKeywords: ['外祖母', '銀髮'],
          }
        },
        gradingCriteria: {
          rubric: ['準確性', '完整性'],
          minLength: 20,
        }
      };

      const userResponse = '黛玉見到了她的外祖母，一位滿頭銀髮的老太太。';

      const score = await service.evaluateTaskQuality(task, userResponse);

      expect(assessReadingComprehension).toHaveBeenCalledWith({
        passage: task.content.textPassage.text,
        question: task.content.textPassage.question,
        userAnswer: userResponse,
        expectedKeywords: task.content.textPassage.expectedKeywords,
        difficulty: task.difficulty,
      });

      expect(score).toBe(85);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should route POETRY to assessPoetryQuality', async () => {
      const task: DailyTask = {
        id: 'task_poetry',
        type: DailyTaskType.POETRY,
        title: '詩詞背誦測試',
        description: '背誦葬花吟',
        difficulty: TaskDifficulty.MEDIUM,
        xpReward: 8,
        attributeRewards: {},
        timeEstimate: 15,
        createdAt: new Date().toISOString(),
        content: {
          poem: {
            title: '葬花吟',
            author: '林黛玉',
            original: '花謝花飛花滿天，紅消香斷有誰憐。',
          }
        },
        gradingCriteria: {
          rubric: ['準確性', '完整性'],
        }
      };

      const userResponse = '花謝花飛花滿天，紅消香斷有誰憐。';

      const score = await service.evaluateTaskQuality(task, userResponse);

      expect(assessPoetryQuality).toHaveBeenCalledWith({
        poemTitle: task.content.poem.title,
        originalPoem: task.content.poem.original,
        userRecitation: userResponse,
        author: task.content.poem.author,
        difficulty: task.difficulty,
      });

      expect(score).toBe(92);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should route CHARACTER_INSIGHT to scoreCharacterAnalysis', async () => {
      const task: DailyTask = {
        id: 'task_character',
        type: DailyTaskType.CHARACTER_INSIGHT,
        title: '人物分析測試',
        description: '分析林黛玉的性格',
        difficulty: TaskDifficulty.MEDIUM,
        xpReward: 12,
        attributeRewards: {},
        timeEstimate: 20,
        createdAt: new Date().toISOString(),
        content: {
          character: {
            name: '林黛玉',
            description: '賈母的外孫女，寄居賈府',
            traits: ['敏感', '才華', '多愁善感'],
          }
        },
        gradingCriteria: {
          rubric: ['深度', '洞察力'],
          minLength: 50,
        }
      };

      const userResponse = '林黛玉性格敏感細膩，才華橫溢，經常多愁善感。';

      const score = await service.evaluateTaskQuality(task, userResponse);

      expect(scoreCharacterAnalysis).toHaveBeenCalledWith({
        characterName: task.content.character.name,
        characterDescription: task.content.character.description,
        analysisPrompt: task.description,
        userAnalysis: userResponse,
        expectedThemes: task.content.character.traits,
        difficulty: task.difficulty,
      });

      expect(score).toBe(82);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should route CULTURAL_EXPLORATION to gradeCulturalQuiz', async () => {
      const task: DailyTask = {
        id: 'task_cultural',
        type: DailyTaskType.CULTURAL_EXPLORATION,
        title: '文化知識測試',
        description: '清代服飾文化',
        difficulty: TaskDifficulty.EASY,
        xpReward: 15,
        attributeRewards: {},
        timeEstimate: 15,
        createdAt: new Date().toISOString(),
        content: {
          culturalKnowledge: {
            question: '清代女性主要穿什麼服飾？',
            correctAnswer: '旗袍',
            historicalContext: '清代滿族統治，旗袍成為主要服飾',
          }
        },
        gradingCriteria: {
          rubric: ['準確性'],
        }
      };

      const userResponse = '旗袍';

      const score = await service.evaluateTaskQuality(task, userResponse);

      expect(gradeCulturalQuiz).toHaveBeenCalledWith({
        quizTitle: task.title,
        quizQuestions: [
          {
            question: task.content.culturalKnowledge.question,
            correctAnswer: task.content.culturalKnowledge.correctAnswer,
            userAnswer: userResponse,
            culturalContext: task.content.culturalKnowledge.historicalContext,
          },
        ],
        difficulty: task.difficulty,
      });

      expect(score).toBe(80);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should route COMMENTARY_DECODE to scoreCommentaryInterpretation', async () => {
      const task: DailyTask = {
        id: 'task_commentary',
        type: DailyTaskType.COMMENTARY_DECODE,
        title: '脂批解讀測試',
        description: '解讀脂硯齋批語',
        difficulty: TaskDifficulty.HARD,
        xpReward: 18,
        attributeRewards: {},
        timeEstimate: 25,
        createdAt: new Date().toISOString(),
        content: {
          textPassage: {
            text: '可卿引他至太虛幻境',
            chapter: '第五回',
            question: '',
            expectedKeywords: [],
          },
          commentary: {
            text: '此回可卿夢中所見，皆是後文伏筆。',
            relatedPassage: '可卿引他至太虛幻境，警幻仙姑處',
            hints: ['伏筆', '命運暗示'],
          }
        },
        gradingCriteria: {
          rubric: ['洞察力', '文學敏感度'],
          minLength: 50,
        }
      };

      const userResponse = '這條批語指出夢境中的內容都是後文情節的伏筆。';

      const score = await service.evaluateTaskQuality(task, userResponse);

      expect(scoreCommentaryInterpretation).toHaveBeenCalledWith({
        commentaryText: task.content.commentary.text,
        relatedPassage: task.content.commentary.relatedPassage,
        chapterContext: 'Chapter 第五回',
        userInterpretation: userResponse,
        interpretationHints: task.content.commentary.hints,
        difficulty: task.difficulty,
      });

      expect(score).toBe(78);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Content Extraction', () => {
    it('should extract passage content from MORNING_READING task', async () => {
      const task: DailyTask = {
        id: 'task_extract_passage',
        type: DailyTaskType.MORNING_READING,
        title: '內容提取測試',
        description: '',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {
          textPassage: {
            text: '測試段落',
            chapter: '第一回',
            question: '測試問題',
            expectedKeywords: ['關鍵詞'],
          }
        },
        gradingCriteria: { rubric: [] }
      };

      await service.evaluateTaskQuality(task, '測試答案');

      expect(assessReadingComprehension).toHaveBeenCalledWith(
        expect.objectContaining({
          passage: '測試段落',
          question: '測試問題',
          expectedKeywords: ['關鍵詞'],
        })
      );
    });

    it('should extract poem content from POETRY task', async () => {
      const task: DailyTask = {
        id: 'task_extract_poem',
        type: DailyTaskType.POETRY,
        title: '詩詞提取測試',
        description: '',
        difficulty: TaskDifficulty.MEDIUM,
        xpReward: 8,
        attributeRewards: {},
        timeEstimate: 15,
        createdAt: new Date().toISOString(),
        content: {
          poem: {
            title: '測試詩',
            author: '測試作者',
            original: '測試詩詞內容',
          }
        },
        gradingCriteria: { rubric: [] }
      };

      await service.evaluateTaskQuality(task, '測試背誦');

      expect(assessPoetryQuality).toHaveBeenCalledWith(
        expect.objectContaining({
          poemTitle: '測試詩',
          originalPoem: '測試詩詞內容',
          author: '測試作者',
        })
      );
    });

    it('should extract character content from CHARACTER_INSIGHT task', async () => {
      const task: DailyTask = {
        id: 'task_extract_character',
        type: DailyTaskType.CHARACTER_INSIGHT,
        title: '人物提取測試',
        description: '測試分析提示',
        difficulty: TaskDifficulty.MEDIUM,
        xpReward: 12,
        attributeRewards: {},
        timeEstimate: 20,
        createdAt: new Date().toISOString(),
        content: {
          character: {
            name: '測試人物',
            description: '測試描述',
            traits: ['特點1', '特點2'],
          }
        },
        gradingCriteria: { rubric: [] }
      };

      await service.evaluateTaskQuality(task, '測試分析');

      expect(scoreCharacterAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          characterName: '測試人物',
          characterDescription: '測試描述',
          expectedThemes: ['特點1', '特點2'],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return fallback score (60) when content field is missing', async () => {
      const task: DailyTask = {
        id: 'task_missing_content',
        type: DailyTaskType.MORNING_READING,
        title: '缺少內容',
        description: '',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {
          // Missing textPassage
        },
        gradingCriteria: { rubric: [] }
      };

      const score = await service.evaluateTaskQuality(task, '測試答案');

      // Should return fallback score when content is missing
      expect(score).toBe(60);
      expect(assessReadingComprehension).not.toHaveBeenCalled();
    });

    it('should return fallback score (60) when AI flow throws error', async () => {
      // Mock AI flow to throw error
      (assessReadingComprehension as jest.Mock).mockRejectedValueOnce(
        new Error('AI service unavailable')
      );

      const task: DailyTask = {
        id: 'task_ai_error',
        type: DailyTaskType.MORNING_READING,
        title: 'AI 錯誤測試',
        description: '',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {
          textPassage: {
            text: '測試段落',
            chapter: '第一回',
            question: '測試問題',
            expectedKeywords: [],
          }
        },
        gradingCriteria: { rubric: [] }
      };

      const score = await service.evaluateTaskQuality(task, '測試答案');

      // Should return fallback score when AI fails
      expect(score).toBe(60);
      expect(assessReadingComprehension).toHaveBeenCalled();
    });

    it('should handle unknown task type with length-based fallback', async () => {
      const task = {
        id: 'task_unknown_type',
        type: 'UNKNOWN_TYPE' as any, // Invalid task type
        title: '未知任務類型',
        description: '',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {},
        gradingCriteria: { rubric: [], minLength: 50 }
      };

      const shortResponse = '短答案';
      const mediumResponse = '這是一個中等長度的答案，包含了一些內容。'.repeat(2);
      const longResponse = '這是一個長答案，包含了很多內容。'.repeat(5);

      const shortScore = await service.evaluateTaskQuality(task, shortResponse);
      const mediumScore = await service.evaluateTaskQuality(task, mediumResponse);
      const longScore = await service.evaluateTaskQuality(task, longResponse);

      // Fallback scoring based on length
      expect(shortScore).toBe(40); // < minLength
      expect(mediumScore).toBe(70); // < minLength * 2
      expect(longScore).toBe(85); // >= minLength * 2
    });
  });

  describe('Score Normalization', () => {
    it('should ensure all scores are integers between 0-100', async () => {
      // Mock AI flow to return out-of-range scores
      (assessReadingComprehension as jest.Mock).mockResolvedValueOnce({
        score: 105, // Out of range
        accuracy: 90,
        completeness: 80,
        keywordsCaptured: [],
        keywordsMissed: [],
        feedback: 'Test',
        detailedAnalysis: 'Test'
      });

      const task: DailyTask = {
        id: 'task_normalize',
        type: DailyTaskType.MORNING_READING,
        title: '分數標準化測試',
        description: '',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        attributeRewards: {},
        timeEstimate: 10,
        createdAt: new Date().toISOString(),
        content: {
          textPassage: {
            text: '測試',
            chapter: '第一回',
            question: '問題',
            expectedKeywords: [],
          }
        },
        gradingCriteria: { rubric: [] }
      };

      const score = await service.evaluateTaskQuality(task, '答案');

      // Even if AI returns 105, should be capped at 100
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    });
  });
});
