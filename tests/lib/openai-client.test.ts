/**
 * @fileOverview Unit Tests for OpenAI Client (GPT-5-Mini Integration)
 *
 * This test suite verifies the OpenAI client initialization, configuration,
 * and utility functions for GPT-5-Mini integration.
 *
 * Test Coverage:
 * - Client initialization with valid/invalid API keys
 * - Completion generation with GPT-5-Mini
 * - Timeout and retry configuration
 * - Fallback mechanisms when API unavailable
 * - Error handling and propagation
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal client operations
 * 2. Edge Cases: Timeout, retry, missing config
 * 3. Failure Cases: API errors, invalid responses
 *
 * @phase Phase 2.10 - GPT-5-Mini Integration Testing
 */

// Mock OpenAI SDK to avoid real API calls
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

            return {
              output_text: 'Mock AI response from GPT-5-Mini',
              model: params.model || 'gpt-5-mini',
              usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
              },
            };
          }),
        },
      };
    }),
  };
});

// Import after mocks
import {
  getOpenAIClient,
  generateCompletion,
  generateCompletionWithFallback,
  isOpenAIAvailable,
  OPENAI_CONSTANTS,
} from '@/lib/openai-client';

describe('OpenAI Client Tests (GPT-5-Mini Integration)', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Reset modules and mocks before each test
    jest.clearAllMocks();
    jest.resetModules(); // Reset module cache to reinitialize client

    // Set mock API key for tests
    process.env.OPENAI_API_KEY = 'mock-test-api-key';
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('Client Initialization - Expected Use Cases', () => {
    /**
     * Test Case 1: Should initialize OpenAI client with valid API key
     *
     * Verifies that the client is properly initialized when a valid API key
     * is provided in environment variables
     */
    it('should initialize OpenAI client with valid API key', () => {
      // Arrange
      process.env.OPENAI_API_KEY = 'valid-api-key-123';

      // Act
      const isAvailable = isOpenAIAvailable();

      // Assert
      expect(isAvailable).toBe(true);
      expect(process.env.OPENAI_API_KEY).toBe('valid-api-key-123');
    });

    /**
     * Test Case 2: Should throw error when API key is missing
     *
     * Verifies that initialization fails gracefully when no API key is provided
     */
    it('should throw error when API key is missing', () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;

      // Act & Assert
      expect(() => getOpenAIClient()).toThrow('OPENAI_API_KEY is not configured');
    });

    /**
     * Test Case 3: Should configure timeout and retry settings correctly
     *
     * Verifies that the client is configured with correct timeout and retry values
     */
    it('should configure timeout and retry settings correctly', () => {
      // Assert
      expect(OPENAI_CONSTANTS.timeout).toBe(10000); // 10 seconds
      expect(OPENAI_CONSTANTS.maxRetries).toBe(2);
      expect(OPENAI_CONSTANTS.defaultModel).toBe('gpt-5-mini');
    });
  });

  describe('Completion Generation - Expected Use Cases', () => {
    /**
     * Test Case 4: Should generate completion with GPT-5-Mini successfully
     *
     * Verifies successful completion generation with correct response structure
     */
    it('should generate completion with GPT-5-Mini successfully', async () => {
      // Arrange
      const input = '分析以下答案：這是一個很好的回答';

      // Act
      const result = await generateCompletion({
        model: 'gpt-5-mini',
        input,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.output_text).toBe('Mock AI response from GPT-5-Mini');
      expect(result.model).toBe('gpt-5-mini');
      expect(result.usage).toBeDefined();
      expect(result.usage?.total_tokens).toBe(30);
    });

    /**
     * Test Case 5: Should handle API timeout and return error
     *
     * Verifies that timeout errors are properly caught and handled
     */
    it('should handle API timeout and return error', async () => {
      // Arrange - Mock timeout scenario
      const OpenAI = require('openai').default;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Request timeout')), 11000)
            )
          ),
        },
      }));

      // Act & Assert
      await expect(generateCompletion({
        input: 'Test timeout'
      })).rejects.toThrow();
    });

    /**
     * Test Case 6: Should retry on transient failures
     *
     * Verifies that the client retries on transient API failures
     */
    it('should retry on transient failures', async () => {
      // Arrange - Mock retry scenario
      const OpenAI = require('openai').default;
      let callCount = 0;
      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              throw new Error('Transient error');
            }
            return {
              output_text: 'Success after retry',
              model: 'gpt-5-mini',
            };
          }),
        },
      }));

      // Act
      const result = await generateCompletion({
        input: 'Test retry'
      });

      // Assert
      expect(result.output_text).toBe('Success after retry');
      expect(callCount).toBe(2); // First call failed, second succeeded
    });
  });

  describe('Fallback Mechanism - Edge Cases', () => {
    /**
     * Test Case 7: Should use fallback value when API unavailable
     *
     * Verifies that fallback value is returned when OpenAI is not available
     */
    it('should use fallback value when API unavailable', async () => {
      // Arrange
      delete process.env.OPENAI_API_KEY;
      const fallbackValue = '基本達標，繼續加油！';

      // Act
      const result = await generateCompletionWithFallback(
        { input: 'Test input' },
        fallbackValue
      );

      // Assert
      expect(result).toBe(fallbackValue);
    });

    /**
     * Test Case 8: Should return fallback on timeout
     *
     * Verifies that fallback is used when API call exceeds timeout
     */
    it('should return fallback on timeout', async () => {
      // Arrange
      const fallbackValue = 'Fallback response';
      const OpenAI = require('openai').default;

      OpenAI.mockImplementationOnce(() => ({
        responses: {
          create: jest.fn().mockImplementation(() =>
            new Promise((resolve) =>
              setTimeout(() => resolve({
                output_text: 'Too slow',
                model: 'gpt-5-mini',
              }), 2000) // 2 second delay
            )
          ),
        },
      }));

      // Act
      const result = await generateCompletionWithFallback(
        { input: 'Test timeout' },
        fallbackValue,
        1000 // 1 second timeout
      );

      // Assert
      expect(result).toBe(fallbackValue);
    }, 10000); // Extend test timeout
  });
});
