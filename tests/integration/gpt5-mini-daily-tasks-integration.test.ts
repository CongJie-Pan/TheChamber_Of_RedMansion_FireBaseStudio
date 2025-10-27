/**
 * @fileOverview Integration Tests for GPT-5-Mini Daily Tasks System
 *
 * This integration test suite verifies the complete end-to-end flow of the
 * AI-powered daily tasks system, including:
 * - Task generation with AI content
 * - User task submission
 * - AI-powered feedback generation
 * - XP rewards and progress tracking
 * - Data persistence in Firestore
 *
 * Test Coverage:
 * - End-to-end task lifecycle (generation → submission → feedback → rewards)
 * - Integration between TaskGenerator, DailyTaskService, and AI services
 * - Firestore data persistence
 * - Fallback mechanisms across the full stack
 * - Multi-task completion scenarios
 * - Error handling and recovery
 *
 * Test Categories:
 * 1. End-to-End Task Flow: Complete task lifecycle
 * 2. AI Integration Points: Task content and feedback generation
 * 3. Data Persistence: Firestore operations
 * 4. Error Handling: Graceful degradation and recovery
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
            await new Promise(resolve => setTimeout(resolve, 100));

            const input = params.input as string;

            // Mock task content generation responses
            if (input.includes('晨讀時光')) {
              return {
                output_text: JSON.stringify({
                  textPassage: {
                    text: '寶玉因見他外面罩著大紅羽緞對衿褂子，因問："下雪了麼？"',
                    source: '第八回',
                    question: '這段描寫了什麼場景？',
                    expectedKeywords: ['寶玉', '下雪', '羽緞'],
                  },
                }),
                model: 'gpt-5-mini',
                usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 },
              };
            }

            // Mock feedback generation responses
            if (input.includes('學生回答')) {
              const score = input.match(/學生得分[：:]\s*(\d+)/)?.[1];
              const scoreNum = score ? parseInt(score) : 75;

              if (scoreNum >= 90) {
                return {
                  output_text: '優點：您準確捕捉到了文本的關鍵細節，理解深刻。\n不足：可以進一步分析人物心理。\n建議：嘗試探討寶玉詢問天氣背後的關懷之情。',
                  model: 'gpt-5-mini',
                  usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
                };
              } else if (scoreNum >= 60) {
                return {
                  output_text: '基本達標，但可以更深入。建議重新閱讀段落，注意人物對話中的情感表達。',
                  model: 'gpt-5-mini',
                  usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 },
                };
              } else {
                return {
                  output_text: '回答尚不完整，建議認真閱讀原文，關注場景描寫和人物互動的細節。',
                  model: 'gpt-5-mini',
                  usage: { prompt_tokens: 100, completion_tokens: 35, total_tokens: 135 },
                };
              }
            }

            // Default response
            return {
              output_text: '基本達標，繼續加油！',
              model: 'gpt-5-mini',
              usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
            };
          }),
        },
      };
    }),
  };
});

// Mock Firestore BEFORE imports (to avoid initialization error)
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
};

jest.mock('@/lib/firebase', () => ({
  db: mockFirestore,
  auth: {
    currentUser: { uid: 'test-user-123' },
  },
}));

// Import after mocks
import { DailyTaskService } from '@/lib/daily-task-service';
import { TaskGenerator } from '@/lib/task-generator';
import { DailyTaskType, TaskDifficulty } from '@/lib/types/daily-task';
import { clearContentCache } from '@/lib/ai-task-content-generator';

describe('GPT-5-Mini Daily Tasks Integration Tests', () => {
  let dailyTaskService: DailyTaskService;
  let taskGenerator: TaskGenerator;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clearContentCache();

    // Set mock API key
    process.env.OPENAI_API_KEY = 'mock-integration-test-api-key';

    // Initialize services
    dailyTaskService = new DailyTaskService();
    taskGenerator = new TaskGenerator();

    // Setup Firestore mocks
    setupFirestoreMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearContentCache();
  });

  describe('End-to-End Task Flow', () => {
    /**
     * Test Case 1: Complete task lifecycle (generation → submission → feedback → rewards)
     *
     * Verifies the full flow from AI-generated task to AI-powered feedback
     */
    it('should complete full task lifecycle with AI integration', async () => {
      // Arrange
      const userId = 'test-user-123';
      const userLevel = 3;
      const taskDate = '2024-01-15';

      // Act - Step 1: Generate tasks with AI content
      const generatedTasks = await taskGenerator.generateTasksForUser(
        userId,
        userLevel,
        taskDate
      );

      // Assert - Tasks generated successfully
      expect(generatedTasks).toBeDefined();
      expect(generatedTasks.length).toBeGreaterThan(0);

      const morningReadingTask = generatedTasks.find(
        t => t.type === DailyTaskType.MORNING_READING
      );
      expect(morningReadingTask).toBeDefined();

      // Act - Step 2: Submit task answer
      const userAnswer = '這段描寫了寶玉看到大紅羽緞褂子後詢問是否下雪的場景。';
      const submissionResult = await dailyTaskService.submitTaskCompletion(
        userId,
        morningReadingTask!.id,
        userAnswer
      );

      // Assert - Submission processed with AI feedback
      expect(submissionResult).toBeDefined();
      expect(submissionResult.feedback).toBeDefined();
      expect(submissionResult.feedback.length).toBeGreaterThan(10);
      expect(submissionResult.score).toBeGreaterThan(0);
      expect(submissionResult.xpEarned).toBeGreaterThan(0);
    }, 30000); // Extended timeout for full flow

    /**
     * Test Case 2: Complete daily task cycle with multiple task types
     *
     * Verifies handling of multiple task completions in sequence
     */
    it('should handle multiple task completions with AI feedback', async () => {
      // Arrange
      const userId = 'test-user-456';
      const userLevel = 4;
      const taskDate = '2024-01-16';

      // Act - Generate multiple tasks
      const tasks = await taskGenerator.generateTasksForUser(
        userId,
        userLevel,
        taskDate
      );

      expect(tasks.length).toBeGreaterThan(1);

      // Act - Submit multiple tasks
      const submissions = [];
      for (let i = 0; i < Math.min(2, tasks.length); i++) {
        const task = tasks[i];
        const answer = `測試答案 for ${task.type}`;

        const result = await dailyTaskService.submitTaskCompletion(
          userId,
          task.id,
          answer
        );
        submissions.push(result);
      }

      // Assert - All submissions processed
      expect(submissions.length).toBe(2);
      submissions.forEach(submission => {
        expect(submission.feedback).toBeDefined();
        expect(submission.score).toBeGreaterThanOrEqual(0);
        expect(submission.xpEarned).toBeGreaterThanOrEqual(0);
      });
    }, 30000);

    /**
     * Test Case 3: Task completion with high-quality answer
     *
     * Verifies that high-quality answers receive appropriate AI feedback and rewards
     */
    it('should provide detailed feedback for high-quality answers', async () => {
      // Arrange
      const userId = 'test-user-789';
      const userLevel = 5;
      const taskDate = '2024-01-17';

      const tasks = await taskGenerator.generateTasksForUser(
        userId,
        userLevel,
        taskDate
      );

      const task = tasks[0];

      // Act - Submit high-quality answer
      const excellentAnswer = '這段通過服飾描寫（大紅羽緞對衿褂子）暗示天氣變化，展現了寶玉對他人的細心關懷，體現了曹雪芹細膩的寫作手法。';
      const result = await dailyTaskService.submitTaskCompletion(
        userId,
        task.id,
        excellentAnswer
      );

      // Assert - High score and detailed feedback
      expect(result.score).toBeGreaterThan(80);
      expect(result.feedback).toContain('優點');
      expect(result.xpEarned).toBeGreaterThan(50);
    }, 30000);
  });

  describe('AI Integration Points', () => {
    /**
     * Test Case 4: Task generation uses AI-powered content
     *
     * Verifies that task generator successfully integrates with AI content service
     */
    it('should generate tasks with AI-powered content', async () => {
      // Arrange
      const userId = 'test-user-ai-content';
      const userLevel = 3;
      const taskDate = '2024-01-18';

      // Act
      const tasks = await taskGenerator.generateTasksForUser(
        userId,
        userLevel,
        taskDate,
        undefined,
        undefined
      );

      // Assert - Tasks have dynamic content
      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);

      const task = tasks[0];
      expect(task.content).toBeDefined();

      // Verify content structure based on task type
      if (task.type === DailyTaskType.MORNING_READING && 'textPassage' in task.content) {
        expect(task.content.textPassage.text).toBeDefined();
        expect(task.content.textPassage.question).toBeDefined();
      }
    }, 30000);

    /**
     * Test Case 5: Feedback generation uses AI analysis
     *
     * Verifies AI-powered feedback varies based on answer quality
     */
    it('should generate AI-powered feedback based on answer quality', async () => {
      // Arrange
      const userId = 'test-user-feedback';
      const taskId = 'task-feedback-test-001';

      // Create mock task
      const mockTask = {
        id: taskId,
        type: DailyTaskType.MORNING_READING,
        difficulty: TaskDifficulty.MEDIUM,
        title: '晨讀時光',
        content: {
          textPassage: {
            text: '測試文本',
            source: '第一回',
            question: '測試問題',
            expectedKeywords: ['關鍵詞'],
          },
        },
        date: '2024-01-19',
        xpReward: 100,
        status: 'available' as const,
      };

      // Mock task retrieval
      mockGetTask(taskId, mockTask);

      // Act - Submit different quality answers
      const poorAnswer = '不知道';
      const poorResult = await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        poorAnswer
      );

      const goodAnswer = '這段描寫了主要人物的性格特點和情節發展';
      const goodResult = await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        goodAnswer
      );

      // Assert - Different feedback quality
      expect(poorResult.score).toBeLessThan(goodResult.score);
      expect(poorResult.feedback).toBeDefined();
      expect(goodResult.feedback).toBeDefined();
      expect(goodResult.feedback.length).toBeGreaterThan(poorResult.feedback.length);
    }, 30000);

    /**
     * Test Case 6: Fallback mechanisms work across full flow
     *
     * Verifies graceful degradation when AI services unavailable
     */
    it('should use fallback mechanisms when AI unavailable', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY; // Simulate no API key

      const userId = 'test-user-fallback';
      const userLevel = 3;
      const taskDate = '2024-01-20';

      // Act - Generate tasks without AI
      const tasks = await taskGenerator.generateTasksForUser(
        userId,
        userLevel,
        taskDate
      );

      expect(tasks).toBeDefined();
      expect(tasks.length).toBeGreaterThan(0);

      const task = tasks[0];

      // Mock task retrieval
      mockGetTask(task.id, task);

      // Act - Submit task answer without AI feedback
      const answer = '測試答案';
      const result = await dailyTaskService.submitTaskCompletion(
        userId,
        task.id,
        answer
      );

      // Assert - Fallback mechanisms worked
      expect(result).toBeDefined();
      expect(result.feedback).toBeDefined(); // Should have template feedback
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.xpEarned).toBeGreaterThanOrEqual(0);

      // Restore API key
      process.env.OPENAI_API_KEY = 'mock-integration-test-api-key';
    }, 30000);
  });

  describe('Data Persistence', () => {
    /**
     * Test Case 7: Task completion saved to Firestore
     *
     * Verifies that task submissions are properly persisted
     */
    it('should persist task completion to Firestore', async () => {
      // Arrange
      const userId = 'test-user-persist';
      const taskId = 'task-persist-001';

      const mockTask = createMockTask(taskId);
      mockGetTask(taskId, mockTask);

      const addDocSpy = jest.spyOn(mockFirestore, 'addDoc');

      // Act
      await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        '測試答案'
      );

      // Assert - Firestore addDoc called
      expect(addDocSpy).toHaveBeenCalled();
    }, 30000);

    /**
     * Test Case 8: XP rewards properly credited
     *
     * Verifies XP calculation and persistence
     */
    it('should calculate and persist XP rewards correctly', async () => {
      // Arrange
      const userId = 'test-user-xp';
      const taskId = 'task-xp-001';

      const mockTask = createMockTask(taskId, 100); // 100 XP reward
      mockGetTask(taskId, mockTask);

      // Act
      const result = await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        '優秀的答案'
      );

      // Assert - XP calculated based on score and base reward
      expect(result.xpEarned).toBeGreaterThan(0);
      expect(result.xpEarned).toBeLessThanOrEqual(100);
    }, 30000);
  });

  describe('Error Handling and Recovery', () => {
    /**
     * Test Case 9: Graceful handling of API errors
     *
     * Verifies system continues functioning despite AI service failures
     */
    it('should handle API errors gracefully', async () => {
      // Arrange - Mock API error
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockRejectedValue(new Error('API Rate Limit')),
        },
      }));

      const userId = 'test-user-error';
      const taskId = 'task-error-001';

      const mockTask = createMockTask(taskId);
      mockGetTask(taskId, mockTask);

      // Act - Should not throw, should fallback
      const result = await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        '測試答案'
      );

      // Assert - Fallback feedback used
      expect(result).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    }, 30000);

    /**
     * Test Case 10: Recovery from transient failures
     *
     * Verifies retry mechanisms work across the system
     */
    it('should retry on transient failures', async () => {
      // Arrange - Mock transient failure then success
      const OpenAI = require('openai').default;
      let callCount = 0;

      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              throw new Error('Transient network error');
            }
            return {
              output_text: '恢復後的回應',
              model: 'gpt-5-mini',
              usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
            };
          }),
        },
      }));

      const userId = 'test-user-retry';
      const taskId = 'task-retry-001';

      const mockTask = createMockTask(taskId);
      mockGetTask(taskId, mockTask);

      // Act
      const result = await dailyTaskService.submitTaskCompletion(
        userId,
        taskId,
        '測試答案'
      );

      // Assert - Eventually succeeded
      expect(result).toBeDefined();
      expect(callCount).toBeGreaterThan(1); // Retry occurred
    }, 30000);
  });

  // Helper functions

  function setupFirestoreMocks() {
    mockFirestore.collection.mockReturnValue({
      doc: mockFirestore.doc,
      add: mockFirestore.addDoc,
    });

    mockFirestore.doc.mockReturnValue({
      get: mockFirestore.getDoc,
      set: mockFirestore.setDoc,
      update: mockFirestore.updateDoc,
    });

    mockFirestore.addDoc.mockResolvedValue({
      id: 'mock-doc-id-' + Date.now(),
    });

    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
  }

  function mockGetTask(taskId: string, taskData: any) {
    mockFirestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => taskData,
      id: taskId,
    });
  }

  function createMockTask(taskId: string, xpReward: number = 100) {
    return {
      id: taskId,
      type: DailyTaskType.MORNING_READING,
      difficulty: TaskDifficulty.MEDIUM,
      title: '晨讀時光',
      content: {
        textPassage: {
          text: '黛玉方進入房時',
          source: '第三回',
          question: '描述場景',
          expectedKeywords: ['黛玉'],
        },
      },
      date: '2024-01-15',
      xpReward,
      status: 'available' as const,
    };
  }
});
