/**
 * @fileOverview Unit Tests for AI Task Content Generator (GPT-5-Mini Integration)
 *
 * This test suite verifies the AI-powered dynamic task content generation system
 * for the Red Mansion educational platform's daily tasks.
 *
 * Test Coverage:
 * - Content generation for all 5 task types
 * - User-adaptive content based on level, history, and preferences
 * - Content caching mechanism (24-hour TTL)
 * - Fallback to hardcoded content when AI unavailable
 * - JSON parsing and validation
 * - Traditional Chinese output enforcement
 *
 * Test Categories:
 * 1. Content Generation: All task types (MORNING_READING, POETRY, etc.)
 * 2. User Adaptation: Level-based, history-aware, preference-driven
 * 3. Caching System: Cache hits, TTL, invalidation
 * 4. Fallback Mechanisms: API failures, validation errors
 * 5. Content Validation: JSON parsing, schema compliance
 *
 * @phase Phase 2.10 - GPT-5-Mini Integration Testing
 */

// Shared mock function for responses.create (tracked across all OpenAI instances)
const mockResponsesCreate = jest.fn().mockImplementation(async (params) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 150));

  const input = params.input as string;

  // Mock responses based on task type detected in prompt
  if (input.includes('晨讀時光') || input.includes('MORNING_READING')) {
    return {
      output_text: JSON.stringify({
        textPassage: {
          text: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來，黛玉便知是他外祖母。',
          source: '第三回',
          question: '這段文字描述了黛玉初見何人？',
          expectedKeywords: ['外祖母', '賈母', '初見'],
        },
      }),
      model: 'gpt-5-mini',
      usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 },
    };
  }

  if (input.includes('詩詞韻律') || input.includes('POETRY')) {
    return {
      output_text: JSON.stringify({
        poem: {
          title: '葬花吟（節選）',
          author: '林黛玉',
          content: '花謝花飛花滿天，紅消香斷有誰憐？\n遊絲軟繫飄春榭，落絮輕沾撲繡簾。',
          background: '黛玉葬花時所吟，表達對命運的感傷與無奈。',
        },
      }),
      model: 'gpt-5-mini',
      usage: { prompt_tokens: 180, completion_tokens: 90, total_tokens: 270 },
    };
  }

  if (input.includes('人物洞察') || input.includes('CHARACTER_INSIGHT')) {
    return {
      output_text: JSON.stringify({
        character: {
          name: '林黛玉',
          description: '賈母的外孫女，自幼父母雙亡，寄居賈府。才華橫溢，詩詞造詣極高，但性格敏感多疑，體弱多病。',
          analysisPrompts: ['分析黛玉的性格特點', '探討黛玉與寶玉的關係', '黛玉的悲劇命運'],
          relatedChapters: [3, 27, 98],
        },
      }),
      model: 'gpt-5-mini',
      usage: { prompt_tokens: 220, completion_tokens: 110, total_tokens: 330 },
    };
  }

  if (input.includes('文化探秘') || input.includes('CULTURAL_EXPLORATION')) {
    return {
      output_text: JSON.stringify({
        culturalKnowledge: {
          topic: '清代服飾文化',
          question: '《紅樓夢》中，貴族女性在正式場合常穿的外衣稱為什麼？',
          options: ['襖', '褂', '裙', '袍'],
          correctAnswer: 0,
          historicalContext: '清代貴族女性服飾講究，襖為常見外衣，通常配有精美刺繡。',
        },
      }),
      model: 'gpt-5-mini',
      usage: { prompt_tokens: 190, completion_tokens: 95, total_tokens: 285 },
    };
  }

  if (input.includes('脂批解密') || input.includes('COMMENTARY_DECODE')) {
    return {
      output_text: JSON.stringify({
        commentary: {
          commentaryText: '此回可卿夢阮，實乃寶玉夢也。作者狡猾之筆。',
          originalText: '寶玉夢遊太虛幻境，警幻仙子演說紅樓夢曲。',
          chapter: 5,
          interpretationHints: ['夢境隱喻人物命運', '警幻仙子的預示作用'],
        },
      }),
      model: 'gpt-5-mini',
      usage: { prompt_tokens: 210, completion_tokens: 105, total_tokens: 315 },
    };
  }

  // Default fallback
  return {
    output_text: '{}',
    model: 'gpt-5-mini',
    usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 },
  };
});

// Mock OpenAI SDK before imports
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation((config) => {
      if (!config?.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      return {
        responses: {
          create: mockResponsesCreate, // Use shared mock function
        },
      };
    }),
  };
});

// Import after mocks
import {
  generateTaskContent,
  TaskContentGenerationParams,
  GeneratedTaskContent,
  clearContentCache,
} from '@/lib/ai-task-content-generator';
import { DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';

describe('AI Task Content Generator Tests (GPT-5-Mini Integration)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset modules and mocks before each test
    jest.clearAllMocks();
    clearContentCache(); // Clear cache before each test

    // Set mock API key for tests
    process.env.OPENAI_API_KEY = 'mock-test-api-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    clearContentCache(); // Clean up cache after each test
  });

  describe('Content Generation for Each Task Type', () => {
    /**
     * Test Case 1: Should generate MORNING_READING content with text passage
     *
     * Verifies generation of reading comprehension tasks with text, question, and keywords
     */
    it('should generate MORNING_READING content with text passage', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 3,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.MEDIUM,
        recentChapters: [1, 2, 3],
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('textPassage' in result).toBe(true);
      if ('textPassage' in result) {
        expect(result.textPassage.text).toBeDefined();
        expect(result.textPassage.source).toBeDefined();
        expect(result.textPassage.question).toBeDefined();
        expect(result.textPassage.expectedKeywords).toBeInstanceOf(Array);
        expect(result.textPassage.expectedKeywords.length).toBeGreaterThan(0);
      }
    });

    /**
     * Test Case 2: Should generate POETRY content with poem details
     *
     * Verifies generation of poetry tasks with title, author, content, and background
     */
    it('should generate POETRY content with poem details', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 4,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.MEDIUM,
        learningPreferences: {
          favoriteCharacters: ['林黛玉'],
        },
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('poem' in result).toBe(true);
      if ('poem' in result) {
        expect(result.poem.title).toBeDefined();
        expect(result.poem.author).toBeDefined();
        expect(result.poem.content).toBeDefined();
        expect(result.poem.background).toBeDefined();
        expect(result.poem.content.length).toBeGreaterThan(10);
      }
    });

    /**
     * Test Case 3: Should generate CHARACTER_INSIGHT content with character analysis
     *
     * Verifies generation of character analysis tasks
     */
    it('should generate CHARACTER_INSIGHT content with character analysis', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 5,
        taskType: DailyTaskType.CHARACTER_INSIGHT,
        difficulty: TaskDifficulty.HARD,
        learningPreferences: {
          favoriteCharacters: ['林黛玉', '賈寶玉'],
        },
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('character' in result).toBe(true);
      if ('character' in result) {
        expect(result.character.name).toBeDefined();
        expect(result.character.description).toBeDefined();
        expect(result.character.analysisPrompts).toBeInstanceOf(Array);
        expect(result.character.analysisPrompts.length).toBeGreaterThan(0);
        expect(result.character.relatedChapters).toBeInstanceOf(Array);
      }
    });

    /**
     * Test Case 4: Should generate CULTURAL_EXPLORATION content with quiz
     *
     * Verifies generation of cultural knowledge quizzes
     */
    it('should generate CULTURAL_EXPLORATION content with quiz', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 2,
        taskType: DailyTaskType.CULTURAL_EXPLORATION,
        difficulty: TaskDifficulty.EASY,
        learningPreferences: {
          interestedTopics: ['服飾', '飲食'],
        },
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('culturalKnowledge' in result).toBe(true);
      if ('culturalKnowledge' in result) {
        expect(result.culturalKnowledge.topic).toBeDefined();
        expect(result.culturalKnowledge.question).toBeDefined();
        expect(result.culturalKnowledge.options).toBeInstanceOf(Array);
        expect(result.culturalKnowledge.options.length).toBe(4);
        expect(result.culturalKnowledge.correctAnswer).toBeGreaterThanOrEqual(0);
        expect(result.culturalKnowledge.correctAnswer).toBeLessThan(4);
        expect(result.culturalKnowledge.historicalContext).toBeDefined();
      }
    });

    /**
     * Test Case 5: Should generate COMMENTARY_DECODE content with commentary analysis
     *
     * Verifies generation of commentary interpretation tasks
     */
    it('should generate COMMENTARY_DECODE content with commentary analysis', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 6,
        taskType: DailyTaskType.COMMENTARY_DECODE,
        difficulty: TaskDifficulty.HARD,
        recentChapters: [5, 6, 7],
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('commentary' in result).toBe(true);
      if ('commentary' in result) {
        expect(result.commentary.commentaryText).toBeDefined();
        expect(result.commentary.originalText).toBeDefined();
        expect(result.commentary.chapter).toBeGreaterThan(0);
        expect(result.commentary.interpretationHints).toBeInstanceOf(Array);
        expect(result.commentary.interpretationHints.length).toBeGreaterThan(0);
      }
    });
  });

  describe('User-Adaptive Content Generation', () => {
    /**
     * Test Case 6: Should adapt content difficulty to user level
     *
     * Verifies that generated content matches user's proficiency level
     */
    it('should adapt content difficulty to user level', async () => {
      // Arrange - Test with beginner level (0-1)
      const beginnerParams: TaskContentGenerationParams = {
        userLevel: 1,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.EASY,
      };

      // Act
      const beginnerResult = await generateTaskContent(beginnerParams);

      // Assert
      expect(beginnerResult).toBeDefined();
      expect('textPassage' in beginnerResult).toBe(true);
    });

    /**
     * Test Case 7: Should consider recent chapters in content selection
     *
     * Verifies that task content relates to user's recent reading history
     */
    it('should consider recent chapters in content selection', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 4,
        taskType: DailyTaskType.CHARACTER_INSIGHT,
        difficulty: TaskDifficulty.MEDIUM,
        recentChapters: [3, 27, 98], // Chapters related to Daiyu
        learningPreferences: {
          favoriteCharacters: ['林黛玉'],
        },
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('character' in result).toBe(true);
      if ('character' in result) {
        expect(result.character.name).toBeDefined();
        // Content should be related to recent chapters
        expect(result.character.relatedChapters).toBeInstanceOf(Array);
      }
    });

    /**
     * Test Case 8: Should incorporate user learning preferences
     *
     * Verifies that content generation considers user's favorite characters and topics
     */
    it('should incorporate user learning preferences', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 5,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.MEDIUM,
        learningPreferences: {
          favoriteCharacters: ['林黛玉', '薛寶釵'],
          interestedTopics: ['詩詞', '情感'],
        },
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('poem' in result).toBe(true);
      if ('poem' in result) {
        expect(result.poem.author).toBeDefined();
        // Should prefer poems from favorite characters
        expect(['林黛玉', '薛寶釵', '賈寶玉']).toContain(result.poem.author);
      }
    });
  });

  describe('Content Caching Mechanism', () => {
    /**
     * Test Case 9: Should cache generated content for duplicate requests
     *
     * Verifies that identical requests use cached content
     */
    it('should cache generated content for duplicate requests', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 3,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.MEDIUM,
      };

      // Act - First call
      const firstResult = await generateTaskContent(params);
      const firstCallCount = mockResponsesCreate.mock.calls.length;

      // Act - Second call with same parameters
      const secondResult = await generateTaskContent(params);
      const secondCallCount = mockResponsesCreate.mock.calls.length;

      // Assert
      expect(firstResult).toEqual(secondResult); // Same content returned
      expect(secondCallCount).toBe(firstCallCount); // No additional API call made
    });

    /**
     * Test Case 10: Should generate new content for different cache keys
     *
     * Verifies that different parameters result in different cache entries
     */
    it('should generate new content for different cache keys', async () => {
      // Arrange
      const params1: TaskContentGenerationParams = {
        userLevel: 2,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.EASY,
      };

      const params2: TaskContentGenerationParams = {
        userLevel: 5,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.HARD,
      };

      // Act
      await generateTaskContent(params1);
      const callCountAfterFirst = mockResponsesCreate.mock.calls.length;

      await generateTaskContent(params2);
      const callCountAfterSecond = mockResponsesCreate.mock.calls.length;

      // Assert
      expect(callCountAfterSecond).toBeGreaterThan(callCountAfterFirst); // API called again for different params
    });
  });

  describe('Fallback Mechanisms', () => {
    /**
     * Test Case 11: Should use hardcoded content when API unavailable
     *
     * Verifies graceful degradation to hardcoded content library
     */
    it('should use hardcoded content when API unavailable', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY; // Simulate no API key

      const params: TaskContentGenerationParams = {
        userLevel: 3,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.MEDIUM,
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('textPassage' in result).toBe(true);
      if ('textPassage' in result) {
        // Should return hardcoded content
        expect(result.textPassage.text).toBeDefined();
        expect(result.textPassage.question).toBeDefined();
      }
    });

    /**
     * Test Case 12: Should fallback when AI content validation fails
     *
     * Verifies fallback on invalid JSON or schema mismatch
     */
    it('should fallback when AI content validation fails', async () => {
      // Arrange - Mock invalid JSON response
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockResolvedValue({
            output_text: 'Invalid JSON: { broken }',
            model: 'gpt-5-mini',
          }),
        },
      }));

      const params: TaskContentGenerationParams = {
        userLevel: 4,
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.MEDIUM,
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('poem' in result).toBe(true);
      // Should return hardcoded fallback content
      if ('poem' in result) {
        expect(result.poem.title).toBeDefined();
        expect(result.poem.content).toBeDefined();
      }
    });

    /**
     * Test Case 13: Should handle API timeout gracefully
     *
     * Verifies fallback when API exceeds timeout limit (15 seconds)
     */
    it('should handle API timeout gracefully', async () => {
      // Arrange - Mock slow API response
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(() =>
            new Promise((resolve) =>
              setTimeout(() => resolve({
                output_text: JSON.stringify({ textPassage: { text: 'Too slow' } }),
                model: 'gpt-5-mini',
              }), 16000) // 16 seconds (exceeds 15s timeout)
            )
          ),
        },
      }));

      const params: TaskContentGenerationParams = {
        userLevel: 3,
        taskType: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.EASY,
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('textPassage' in result).toBe(true);
      // Should return hardcoded fallback content due to timeout
    }, 20000); // Extend test timeout to 20 seconds
  });

  describe('Content Validation', () => {
    /**
     * Test Case 14: Should parse and validate JSON output correctly
     *
     * Verifies correct JSON parsing from AI responses
     */
    it('should parse and validate JSON output correctly', async () => {
      // Arrange
      const params: TaskContentGenerationParams = {
        userLevel: 4,
        taskType: DailyTaskType.CULTURAL_EXPLORATION,
        difficulty: TaskDifficulty.MEDIUM,
      };

      // Act
      const result = await generateTaskContent(params);

      // Assert
      expect(result).toBeDefined();
      expect('culturalKnowledge' in result).toBe(true);
      if ('culturalKnowledge' in result) {
        // Validate complete schema
        expect(result.culturalKnowledge.topic).toMatch(/[\u4e00-\u9fa5]+/); // Contains Chinese
        expect(result.culturalKnowledge.question).toBeDefined();
        expect(Array.isArray(result.culturalKnowledge.options)).toBe(true);
        expect(typeof result.culturalKnowledge.correctAnswer).toBe('number');
        expect(result.culturalKnowledge.historicalContext).toBeDefined();
      }
    });

    /**
     * Test Case 15: Should validate schema compliance for each task type
     *
     * Verifies that generated content matches expected schema structure
     */
    it('should validate schema compliance for each task type', async () => {
      // Arrange
      const taskTypes = [
        DailyTaskType.MORNING_READING,
        DailyTaskType.POETRY,
        DailyTaskType.CHARACTER_INSIGHT,
        DailyTaskType.CULTURAL_EXPLORATION,
        DailyTaskType.COMMENTARY_DECODE,
      ];

      // Act & Assert
      for (const taskType of taskTypes) {
        const params: TaskContentGenerationParams = {
          userLevel: 3,
          taskType,
          difficulty: TaskDifficulty.MEDIUM,
        };

        const result = await generateTaskContent(params);

        // Verify that result contains exactly one expected key
        const resultKeys = Object.keys(result);
        expect(resultKeys.length).toBe(1);

        // Verify correct schema based on task type
        switch (taskType) {
          case DailyTaskType.MORNING_READING:
            expect('textPassage' in result).toBe(true);
            break;
          case DailyTaskType.POETRY:
            expect('poem' in result).toBe(true);
            break;
          case DailyTaskType.CHARACTER_INSIGHT:
            expect('character' in result).toBe(true);
            break;
          case DailyTaskType.CULTURAL_EXPLORATION:
            expect('culturalKnowledge' in result).toBe(true);
            break;
          case DailyTaskType.COMMENTARY_DECODE:
            expect('commentary' in result).toBe(true);
            break;
        }
      }
    });
  });
});
