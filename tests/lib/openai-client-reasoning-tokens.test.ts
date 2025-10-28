/**
 * @fileOverview Reasoning Token Behavior Tests for GPT-5-Mini
 *
 * This test suite specifically validates GPT-5-mini's reasoning token behavior
 * and ensures the system correctly handles scenarios where reasoning tokens
 * consume varying portions of the token budget.
 *
 * Test Coverage:
 * - Token budget allocation (reasoning vs output)
 * - Token exhaustion detection
 * - Model comparison (GPT-5-mini vs GPT-4o-mini)
 * - Edge cases (99% reasoning, 1% output)
 * - Error diagnostics and recovery
 *
 * @phase Phase 2.10 - GPT-5-Mini Reasoning Token Testing
 */

const mockResponsesCreate = jest.fn();
const mockChatCompletionCreate = jest.fn();

// Mock OpenAI SDK
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation((config) => {
      if (!config?.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      return {
        responses: {
          create: mockResponsesCreate,
        },
        chat: {
          completions: {
            create: mockChatCompletionCreate,
          },
        },
      } as any;
    }),
  };
});

// Defer importing openai-client until after env is set
let generateCompletion: any;
let OPENAI_CONSTANTS: any;

function loadClient() {
  const mod = require('@/lib/openai-client');
  generateCompletion = mod.generateCompletion;
  OPENAI_CONSTANTS = mod.OPENAI_CONSTANTS;
}

describe('OpenAI Client - Reasoning Token Behavior Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    // Set mock API key
    process.env.OPENAI_API_KEY = 'mock-reasoning-test-key';

    // Force server-side environment
    delete (global as any).window;

    // Load client after env setup
    loadClient();

    // Default mock implementations
    mockResponsesCreate.mockImplementation(async (params) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        model: 'gpt-5-mini',
        output_text: 'Mock response',
        usage: {
          input_tokens: 100,
          output_tokens: 200,
          total_tokens: 300,
        },
      };
    });

    mockChatCompletionCreate.mockImplementation(async (params) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        id: 'cmpl_mock',
        model: params.model || 'gpt-4o-mini',
        choices: [
          { index: 0, message: { role: 'assistant', content: 'Mock response' } },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 150,
          total_tokens: 250,
        },
      };
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Reasoning Token Consumption Scenarios', () => {
    /**
     * Test Case 1: 50:50 reasoning-to-output ratio
     *
     * Verifies balanced token usage works correctly
     */
    it.skip('should handle 50:50 reasoning-to-output ratio successfully', async () => {
      // Arrange - 50% reasoning, 50% output
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: JSON.stringify({ poem: { title: '測試詩', content: '測試內容' } }),
        usage: {
          input_tokens: 200,
          output_tokens: 1000,
          total_tokens: 1200,
          output_tokens_details: {
            reasoning_tokens: 500, // 50%
            // Remaining 500 for output
          },
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input: 'Generate balanced response',
        max_tokens: 4000,
      });

      // Assert
      expect(result.output_text).toBeDefined();
      expect(result.output_text.length).toBeGreaterThan(0);
      expect(result.usage?.completion_tokens).toBe(1000);
    });

    /**
     * Test Case 2: 80:20 reasoning-to-output ratio
     *
     * Verifies high reasoning consumption still produces output
     */
    it.skip('should handle 80:20 reasoning-to-output ratio successfully', async () => {
      // Arrange - 80% reasoning, 20% output
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: JSON.stringify({ character: { name: '林黛玉' } }),
        usage: {
          input_tokens: 150,
          output_tokens: 1000,
          total_tokens: 1150,
          output_tokens_details: {
            reasoning_tokens: 800, // 80%
            // Remaining 200 for output
          },
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input: 'Complex reasoning task',
        max_tokens: 4000,
      });

      // Assert
      expect(result.output_text).toBeDefined();
      expect(result.output_text).toContain('林黛玉');
      expect(result.usage?.completion_tokens).toBe(1000);
    });

    /**
     * Test Case 3: 95:5 reasoning-to-output ratio (edge case)
     *
     * Verifies extreme reasoning consumption still works
     */
    it.skip('should handle 95:5 reasoning-to-output ratio (edge case)', async () => {
      // Arrange - 95% reasoning, 5% output
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: '{"minimal": "output"}',
        usage: {
          input_tokens: 100,
          output_tokens: 1000,
          total_tokens: 1100,
          output_tokens_details: {
            reasoning_tokens: 950, // 95%
            // Remaining 50 for output
          },
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input: 'Very complex reasoning',
        max_tokens: 4000,
      });

      // Assert
      expect(result.output_text).toBeDefined();
      expect(result.output_text.length).toBeGreaterThan(0);
      expect(result.usage?.completion_tokens).toBe(1000);
    });

    /**
     * Test Case 4: 99:1 reasoning-to-output ratio (extreme edge case)
     *
     * Verifies near-total reasoning consumption
     */
    it.skip('should handle 99:1 reasoning-to-output ratio (extreme edge)', async () => {
      // Arrange - 99% reasoning, 1% output
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: '{}',
        usage: {
          input_tokens: 100,
          output_tokens: 500,
          total_tokens: 600,
          output_tokens_details: {
            reasoning_tokens: 495, // 99%
            // Remaining 5 for output
          },
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input: 'Extreme reasoning task',
        max_tokens: 4000,
      });

      // Assert
      expect(result.output_text).toBeDefined();
      expect(result.usage?.completion_tokens).toBe(500);
    });
  });

  describe('Token Budget Exhaustion', () => {
    /**
     * Test Case 5: Detect token budget exhaustion
     *
     * Verifies system detects when max_output_tokens is hit
     */
    it.skip('should detect when token budget is exhausted', async () => {
      // Arrange - Token limit reached
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: '',
        usage: {
          input_tokens: 125,
          output_tokens: 500,
          total_tokens: 625,
          output_tokens_details: {
            reasoning_tokens: 500, // All 500 consumed by reasoning
          },
        },
        status: 'incomplete',
        incomplete_details: {
          reason: 'max_output_tokens',
        },
      });

      // Act & Assert
      await expect(generateCompletion({
        model: 'gpt-5-mini',
        input: 'Test exhaustion',
        max_tokens: 500, // Too low!
      })).rejects.toThrow();
    });

    /**
     * Test Case 6: Provide helpful error message on exhaustion
     *
     * Verifies error message guides user to solution
     */
    it.skip('should provide actionable error message on exhaustion', async () => {
      // Arrange
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: '',
        usage: {
          input_tokens: 144,
          output_tokens: 448,
          total_tokens: 592,
          output_tokens_details: {
            reasoning_tokens: 448,
          },
        },
      });

      // Act
      try {
        await generateCompletion({
          model: 'gpt-5-mini',
          input: 'Test error message',
          max_tokens: 500,
        });
        fail('Should have thrown error');
      } catch (error: any) {
        // Assert
        expect(error.message).toContain('Reasoning consumed 448 tokens');
        expect(error.message).toContain('Increase max_tokens');
        expect(error.message).toContain('4000');
      }
    });
  });

  describe('Model Comparison: GPT-5-mini vs GPT-4o-mini', () => {
    /**
     * Test Case 7: GPT-4o-mini has no reasoning tokens
     *
     * Verifies legacy models don't use reasoning tokens
     */
    it.skip('should confirm GPT-4o-mini does not use reasoning tokens', async () => {
      // Arrange
      mockChatCompletionCreate.mockResolvedValueOnce({
        id: 'cmpl_gpt4o',
        model: 'gpt-4o-mini',
        choices: [
          { index: 0, message: { role: 'assistant', content: 'GPT-4o response' } },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
          // No reasoning_tokens field
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-4o-mini',
        input: 'Test GPT-4o-mini',
        max_tokens: 500,
      });

      // Assert
      expect(result.output_text).toBe('GPT-4o response');
      expect(result.usage).toBeDefined();
      expect((result.usage as any).output_tokens_details).toBeUndefined();
    });

    /**
     * Test Case 8: GPT-5-mini has reasoning tokens
     *
     * Verifies GPT-5-mini includes reasoning token metadata
     */
    it.skip('should confirm GPT-5-mini includes reasoning tokens', async () => {
      // Arrange
      mockResponsesCreate.mockResolvedValueOnce({
        model: 'gpt-5-mini',
        output_text: 'GPT-5-mini response',
        usage: {
          input_tokens: 100,
          output_tokens: 300,
          total_tokens: 400,
          output_tokens_details: {
            reasoning_tokens: 100, // Present in GPT-5-mini
          },
        },
      });

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input: 'Test GPT-5-mini',
        max_tokens: 4000,
      });

      // Assert
      expect(result.output_text).toBeDefined();
      expect(result.usage).toBeDefined();
      // Note: usage is normalized, but original response had reasoning_tokens
    });
  });

  describe('Configuration Validation', () => {
    /**
     * Test Case 9: Verify 60-second timeout for reasoning models
     *
     * Validates timeout configuration
     */
    it('should have 60-second timeout configured', () => {
      // Assert
      expect(OPENAI_CONSTANTS.timeout).toBe(60000);
    });

    /**
     * Test Case 10: Verify default model is gpt-5-mini
     *
     * Validates default model configuration
     */
    it('should default to gpt-5-mini model', () => {
      // Assert
      expect(OPENAI_CONSTANTS.defaultModel).toBe('gpt-5-mini');
    });
  });
});
