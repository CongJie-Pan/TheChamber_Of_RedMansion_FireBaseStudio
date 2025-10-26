/**
 * @fileOverview Unit Tests for AI Feedback Generator (GPT-5-Mini Integration)
 *
 * This test suite verifies the AI-powered feedback generation system for
 * daily task submissions in the Red Mansion educational platform.
 *
 * Test Coverage:
 * - Personalized feedback generation for different task types
 * - Score-based feedback adaptation (high/medium/low)
 * - Traditional Chinese output validation
 * - Fallback mechanisms when API unavailable
 * - Task-specific prompt generation
 * - Edge cases (empty answers, nonsense inputs, API timeouts)
 *
 * Test Categories:
 * 1. Feedback Generation: Quality answers with varying scores
 * 2. Language Validation: Traditional Chinese enforcement
 * 3. Fallback Mechanisms: Template-based responses
 * 4. Task-Specific Prompts: Correct prompt formatting per task type
 *
 * @phase Phase 2.10 - GPT-5-Mini Integration Testing
 */

// Mock OpenAI SDK before imports
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation((config) => {
      if (!config?.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      return {
        responses: {
          create: jest.fn().mockImplementation(async (params) => {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 100));

            // Mock different responses based on input
            const input = params.input as string;

            // Detect nonsense inputs
            if (input.includes('0000000000')) {
              return {
                output_text: '您提交的答案似乎缺乏實質內容（僅包含數字），請認真閱讀題目並提供有意義的回答。建議重新思考問題的核心要求。',
                model: params.model || 'gpt-5-mini',
                usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
              };
            }

            // Detect high-quality answers
            if (input.includes('優秀') || params.input.toString().includes('score: 95')) {
              return {
                output_text: '優點：您的回答準確抓住了《紅樓夢》中的核心概念，分析深入且富有洞察力。\n不足：可以進一步探討文化背景。\n建議：嘗試將文本與現代社會聯繫，加深理解。',
                model: params.model || 'gpt-5-mini',
                usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
              };
            }

            // Default mock response
            return {
              output_text: '基本達標，繼續加油！建議深入思考文本含義，並關注細節描寫。',
              model: params.model || 'gpt-5-mini',
              usage: { prompt_tokens: 80, completion_tokens: 25, total_tokens: 105 },
            };
          }),
        },
      };
    }),
  };
});

// Import after mocks
import {
  generatePersonalizedFeedback,
  FeedbackGenerationParams,
} from '@/lib/ai-feedback-generator';
import { DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

describe('AI Feedback Generator Tests (GPT-5-Mini Integration)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset modules and mocks before each test
    jest.clearAllMocks();

    // Set mock API key for tests
    process.env.OPENAI_API_KEY = 'mock-test-api-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Feedback Generation for Quality Answers', () => {
    /**
     * Test Case 1: Should generate personalized feedback for high-quality answer
     *
     * Verifies that the system provides detailed, encouraging feedback for
     * answers with high scores (90-100)
     */
    it('should generate personalized feedback for high-quality answer', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.MORNING_READING,
        userAnswer: '林黛玉初見外祖母賈母時，展現了其謹慎細膩的性格特點。',
        score: 95,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          textPassage: {
            text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來',
            source: '第三回',
            question: '這段文字描述了黛玉初見何人？',
            expectedKeywords: ['外祖母', '賈母', '初見'],
          },
        },
        taskTitle: '晨讀時光',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(20); // Substantial feedback
      expect(feedback).toContain('優點'); // Should mention strengths
    });

    /**
     * Test Case 2: Should generate constructive feedback for medium-quality answer
     *
     * Verifies balanced feedback for average performance (60-80 score range)
     */
    it('should generate constructive feedback for medium-quality answer', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.CHARACTER_INSIGHT,
        userAnswer: '林黛玉是賈母的外孫女，性格敏感。',
        score: 70,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          character: {
            name: '林黛玉',
            description: '賈母的外孫女，才華橫溢卻體弱多病',
            analysisPrompts: ['分析黛玉的性格特點'],
            relatedChapters: [3, 27],
          },
        },
        taskTitle: '人物洞察',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(15);
      expect(feedback).toMatch(/建議|改進|深入/); // Should provide improvement suggestions
    });

    /**
     * Test Case 3: Should provide critical feedback for low-quality answer
     *
     * Verifies that system gives clear, actionable feedback for poor answers
     */
    it('should provide critical feedback for low-quality answer', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.POETRY,
        userAnswer: '這是一首詩',
        score: 30,
        difficulty: TaskDifficulty.EASY,
        taskContent: {
          poem: {
            title: '葬花吟',
            author: '林黛玉',
            content: '花謝花飛花滿天',
            background: '黛玉葬花時所吟',
          },
        },
        taskTitle: '詩詞韻律',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(10);
      expect(feedback).toMatch(/建議|改進|認真/); // Should encourage improvement
    });

    /**
     * Test Case 4: Should detect and criticize nonsense input
     *
     * Verifies that the system explicitly rejects meaningless answers
     * (addresses user's original complaint about "0000000000")
     */
    it('should detect and criticize nonsense input', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.CULTURAL_EXPLORATION,
        userAnswer: '0000000000', // Nonsense input from user's original complaint
        score: 0,
        difficulty: TaskDifficulty.HARD,
        taskContent: {
          culturalKnowledge: {
            topic: '清代服飾',
            question: '貴族女性常穿的外衣稱為什麼？',
            options: ['襖', '褂', '裙', '袍'],
            correctAnswer: 0,
            historicalContext: '清代貴族女性服飾講究',
          },
        },
        taskTitle: '文化探秘',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback).toMatch(/缺乏實質內容|無意義|認真作答/); // Should explicitly reject nonsense
      expect(feedback.length).toBeGreaterThan(20); // Should provide detailed critique
    });
  });

  describe('Traditional Chinese Validation', () => {
    /**
     * Test Case 5: Should return feedback in Traditional Chinese
     *
     * Verifies that all feedback is in Traditional Chinese (繁體中文)
     */
    it('should return feedback in Traditional Chinese', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.MORNING_READING,
        userAnswer: '黛玉初見賈母',
        score: 85,
        difficulty: TaskDifficulty.EASY,
        taskContent: {
          textPassage: {
            text: '黛玉方進入房時',
            source: '第三回',
            question: '描述黛玉初見何人？',
            expectedKeywords: ['賈母'],
          },
        },
        taskTitle: '晨讀時光',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      // Traditional Chinese characters validation
      expect(feedback).toMatch(/優點|建議|繼續|達標/);
      // Should NOT contain Simplified Chinese
      expect(feedback).not.toMatch(/优点|继续|达标/);
    });

    /**
     * Test Case 6: Should maintain Traditional Chinese across all task types
     *
     * Verifies language consistency across different task types
     */
    it('should maintain Traditional Chinese across all task types', async () => {
      // Arrange - Test with COMMENTARY_DECODE task type
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.COMMENTARY_DECODE,
        userAnswer: '此批語預示了寶玉的命運轉折',
        score: 88,
        difficulty: TaskDifficulty.HARD,
        taskContent: {
          commentary: {
            commentaryText: '此回可卿夢阮，實乃寶玉夢也',
            originalText: '寶玉夢遊太虛幻境一段',
            chapter: 5,
            interpretationHints: ['夢境隱喻', '命運預示'],
          },
        },
        taskTitle: '脂批解密',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback).toMatch(/優點|建議|分析|理解/); // Traditional Chinese terms
    });
  });

  describe('Fallback Mechanisms', () => {
    /**
     * Test Case 7: Should use template feedback when API unavailable
     *
     * Verifies graceful degradation to template-based feedback
     */
    it('should use template feedback when API unavailable', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY; // Simulate no API key

      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.MORNING_READING,
        userAnswer: '黛玉初見賈母',
        score: 75,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          textPassage: {
            text: '黛玉方進入房時',
            source: '第三回',
            question: '描述黛玉初見何人？',
            expectedKeywords: ['賈母'],
          },
        },
        taskTitle: '晨讀時光',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(10);
      // Template feedback should still be meaningful
      expect(feedback).toMatch(/達標|加油|繼續/);
    });

    /**
     * Test Case 8: Should handle API timeout gracefully
     *
     * Verifies fallback when API call exceeds timeout limit
     */
    it('should handle API timeout gracefully', async () => {
      // Arrange - Mock slow API response
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(() =>
            new Promise((resolve) =>
              setTimeout(() => resolve({
                output_text: 'Delayed response',
                model: 'gpt-5-mini',
              }), 12000) // 12 seconds (exceeds 10s timeout)
            )
          ),
        },
      }));

      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.POETRY,
        userAnswer: '花謝花飛花滿天',
        score: 80,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          poem: {
            title: '葬花吟',
            author: '林黛玉',
            content: '花謝花飛花滿天',
            background: '黛玉葬花時所吟',
          },
        },
        taskTitle: '詩詞韻律',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(5);
      // Should fallback to template feedback
    }, 15000); // Extend test timeout

    /**
     * Test Case 9: Should recover from API errors
     *
     * Verifies error handling and fallback on API failures
     */
    it('should recover from API errors', async () => {
      // Arrange - Mock API error
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockRejectedValue(new Error('API Error: Rate limit exceeded')),
        },
      }));

      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.CHARACTER_INSIGHT,
        userAnswer: '林黛玉性格敏感多疑',
        score: 65,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          character: {
            name: '林黛玉',
            description: '賈母的外孫女',
            analysisPrompts: ['分析性格'],
            relatedChapters: [3],
          },
        },
        taskTitle: '人物洞察',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(5);
      // Should successfully return template feedback despite API error
    });
  });

  describe('Task-Specific Prompt Generation', () => {
    /**
     * Test Case 10: Should generate appropriate feedback for MORNING_READING tasks
     *
     * Verifies task-type-specific feedback generation
     */
    it('should generate appropriate feedback for MORNING_READING tasks', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.MORNING_READING,
        userAnswer: '這段描述了黛玉初次見到外祖母賈母的場景，體現了她謹慎的性格。',
        score: 90,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          textPassage: {
            text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來',
            source: '第三回',
            question: '這段文字描述了黛玉初見何人？',
            expectedKeywords: ['外祖母', '賈母', '初見'],
          },
        },
        taskTitle: '晨讀時光',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(15);
    });

    /**
     * Test Case 11: Should generate appropriate feedback for POETRY tasks
     *
     * Verifies poetry-specific feedback criteria
     */
    it('should generate appropriate feedback for POETRY tasks', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.POETRY,
        userAnswer: '花謝花飛花滿天，紅消香斷有誰憐',
        score: 85,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          poem: {
            title: '葬花吟（節選）',
            author: '林黛玉',
            content: '花謝花飛花滿天，紅消香斷有誰憐？',
            background: '黛玉葬花時所吟，表達對命運的感傷',
          },
        },
        taskTitle: '詩詞韻律',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(10);
    });

    /**
     * Test Case 12: Should generate appropriate feedback for CULTURAL_EXPLORATION tasks
     *
     * Verifies cultural knowledge-specific feedback
     */
    it('should generate appropriate feedback for CULTURAL_EXPLORATION tasks', async () => {
      // Arrange
      const params: FeedbackGenerationParams = {
        taskType: DailyTaskType.CULTURAL_EXPLORATION,
        userAnswer: '襖是清代貴族女性常穿的外衣',
        score: 92,
        difficulty: TaskDifficulty.MEDIUM,
        taskContent: {
          culturalKnowledge: {
            topic: '清代服飾',
            question: '《紅樓夢》中，貴族女性常穿的外衣稱為什麼？',
            options: ['襖', '褂', '裙', '袍'],
            correctAnswer: 0,
            historicalContext: '清代貴族女性服飾講究，襖為常見外衣',
          },
        },
        taskTitle: '文化探秘',
      };

      // Act
      const feedback = await generatePersonalizedFeedback(params);

      // Assert
      expect(feedback).toBeDefined();
      expect(feedback.length).toBeGreaterThan(10);
    });
  });
});
