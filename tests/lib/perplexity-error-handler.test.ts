/**
 * @fileOverview Unit Tests for Perplexity Error Handler
 *
 * Tests comprehensive error classification, user message formatting,
 * retry logic, and recovery action suggestions.
 *
 * Coverage:
 * - classifyError() - All error categories
 * - formatErrorForUser() - User-friendly message generation
 * - Recovery action mapping
 * - Context preservation
 * - Edge cases
 */

import {
  classifyError,
  formatErrorForUser,
  PerplexityErrorCategory,
  RecoveryAction,
  type ClassifiedError,
} from '@/lib/perplexity-error-handler';

describe('perplexity-error-handler', () => {
  describe('classifyError()', () => {
    describe('Timeout Error Classification', () => {
      test('should classify error with "timeout" keyword', () => {
        const error = new Error('Request timeout after 30 seconds');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.TIMEOUT);
        expect(classified.shouldRetry).toBe(true);
        expect(classified.retryDelay).toBe(2000);
        expect(classified.fallbackModel).toBe('sonar-pro');
        expect(classified.recoveryActions).toContain(RecoveryAction.RETRY_WITH_REDUCED_TIMEOUT);
        expect(classified.recoveryActions).toContain(RecoveryAction.RETRY_FALLBACK_MODEL);
      });

      test('should classify error with "ETIMEDOUT" keyword', () => {
        const error = new Error('ETIMEDOUT: connection timed out');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.TIMEOUT);
        expect(classified.shouldRetry).toBe(true);
      });

      test('should classify error with "exceeded" keyword', () => {
        const error = new Error('Time limit exceeded');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.TIMEOUT);
        expect(classified.shouldRetry).toBe(true);
      });
    });

    describe('Rate Limit Error Classification', () => {
      test('should classify error with "rate limit" keyword', () => {
        const error = new Error('Rate limit exceeded');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.RATE_LIMIT);
        expect(classified.shouldRetry).toBe(true);
        expect(classified.retryDelay).toBe(60000);
        expect(classified.recoveryActions).toContain(RecoveryAction.WAIT_AND_RETRY);
      });

      test('should classify error with "429" status code', () => {
        const error = new Error('HTTP 429 Too Many Requests');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.RATE_LIMIT);
        expect(classified.shouldRetry).toBe(true);
      });

      test('should classify error with "too many requests" keyword', () => {
        const error = new Error('Too many requests, please slow down');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.RATE_LIMIT);
      });
    });

    describe('Authentication Error Classification', () => {
      test('should classify error with "401" status code', () => {
        const error = new Error('HTTP 401 Unauthorized');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.AUTHENTICATION_ERROR);
        expect(classified.shouldRetry).toBe(false);
        expect(classified.recoveryActions).toContain(RecoveryAction.CHECK_API_KEY);
        expect(classified.recoveryActions).toContain(RecoveryAction.CONTACT_SUPPORT);
      });

      test('should classify error with "unauthorized" keyword', () => {
        const error = new Error('Unauthorized access');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.AUTHENTICATION_ERROR);
        expect(classified.shouldRetry).toBe(false);
      });

      test('should classify error with "authentication" keyword', () => {
        const error = new Error('Authentication failed');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.AUTHENTICATION_ERROR);
      });

      test('should classify error with "API key" keyword', () => {
        const error = new Error('Invalid API key provided');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.AUTHENTICATION_ERROR);
      });
    });

    describe('Network Error Classification', () => {
      test('should classify error with "ECONNREFUSED" keyword', () => {
        const error = new Error('ECONNREFUSED: connection refused');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.NETWORK_ERROR);
        expect(classified.shouldRetry).toBe(true);
        expect(classified.retryDelay).toBe(3000);
        expect(classified.recoveryActions).toContain(RecoveryAction.CHECK_NETWORK);
      });

      test('should classify error with "ENOTFOUND" keyword', () => {
        const error = new Error('ENOTFOUND: DNS lookup failed');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.NETWORK_ERROR);
      });

      test('should classify error with "network" keyword', () => {
        const error = new Error('Network connection failed');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.NETWORK_ERROR);
      });

      test('should classify error with "fetch failed" keyword', () => {
        const error = new Error('fetch failed');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.NETWORK_ERROR);
      });
    });

    describe('Validation Error Classification', () => {
      test('should classify error with "validation" keyword', () => {
        const error = new Error('Validation error: invalid input');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.VALIDATION_ERROR);
        expect(classified.shouldRetry).toBe(false);
        expect(classified.recoveryActions).toContain(RecoveryAction.SIMPLIFY_QUESTION);
        expect(classified.recoveryActions).toContain(RecoveryAction.NO_RETRY);
      });

      test('should classify error with "invalid" keyword', () => {
        const error = new Error('Invalid request format');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.VALIDATION_ERROR);
      });

      test('should classify ValidationError by name', () => {
        const error = new Error('Something went wrong');
        error.name = 'ValidationError';
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.VALIDATION_ERROR);
      });
    });

    describe('Streaming Error Classification', () => {
      test('should classify error with "stream" keyword', () => {
        const error = new Error('Stream interrupted');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.STREAMING_ERROR);
        expect(classified.shouldRetry).toBe(true);
      });

      test('should classify error with "async iterable" keyword', () => {
        const error = new Error('async iterable error');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.STREAMING_ERROR);
      });

      test('should classify error with "SSE" keyword', () => {
        const error = new Error('SSE connection failed');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.STREAMING_ERROR);
      });
    });

    describe('API Error Classification', () => {
      test('should classify error with "400" status code', () => {
        const error = new Error('HTTP 400 Bad Request');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.API_ERROR);
        expect(classified.shouldRetry).toBe(true);
      });

      test('should classify error with "404" status code', () => {
        const error = new Error('HTTP 404 Not Found');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.API_ERROR);
      });

      test('should classify error with "500" status code', () => {
        const error = new Error('HTTP 500 Internal Server Error');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.API_ERROR);
      });

      test('should classify error with "502" status code', () => {
        const error = new Error('HTTP 502 Bad Gateway');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.API_ERROR);
      });
    });

    describe('Unknown Error Classification', () => {
      test('should classify generic Error as unknown', () => {
        const error = new Error('Something unexpected happened');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.UNKNOWN_ERROR);
        expect(classified.shouldRetry).toBe(true);
        expect(classified.retryDelay).toBe(3000);
      });

      test('should classify string error as unknown', () => {
        const error = 'String error message';
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.UNKNOWN_ERROR);
        expect(classified.technicalMessage).toContain('String error message');
      });

      test('should classify object error as unknown', () => {
        const error = { message: 'Object error' };
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.UNKNOWN_ERROR);
      });
    });

    describe('Context Preservation', () => {
      test('should preserve context in classified error', () => {
        const error = new Error('Test error');
        const context = {
          modelKey: 'sonar-reasoning-pro' as const,
          reasoningEffort: 'high' as const,
          questionLength: 100,
          attemptNumber: 1,
        };

        const classified = classifyError(error, context);

        expect(classified.context).toEqual(context);
        expect(classified.context?.modelKey).toBe('sonar-reasoning-pro');
        expect(classified.context?.attemptNumber).toBe(1);
      });

      test('should work without context', () => {
        const error = new Error('Test error');
        const classified = classifyError(error);

        expect(classified.context).toBeUndefined();
      });
    });

    describe('Edge Cases', () => {
      test('should handle empty error message', () => {
        const error = new Error('');
        const classified = classifyError(error);

        expect(classified.category).toBe(PerplexityErrorCategory.UNKNOWN_ERROR);
      });

      test('should handle error with multiple matching keywords (timeout has priority)', () => {
        const error = new Error('timeout and 401 unauthorized');
        const classified = classifyError(error);

        // Timeout should match first since it's checked first
        expect(classified.category).toBe(PerplexityErrorCategory.TIMEOUT);
      });

      test('should handle case-insensitive matching', () => {
        const error1 = new Error('Timeout');
        const error2 = new Error('TIMEOUT');
        const error3 = new Error('timeout');

        expect(classifyError(error1).category).toBe(PerplexityErrorCategory.TIMEOUT);
        expect(classifyError(error2).category).toBe(PerplexityErrorCategory.TIMEOUT);
        expect(classifyError(error3).category).toBe(PerplexityErrorCategory.TIMEOUT);
      });

      test('should handle error with special characters', () => {
        const error = new Error('錯誤：連接超時');
        const classified = classifyError(error);

        // Should classify as unknown since Chinese characters don't match keywords
        expect(classified.category).toBe(PerplexityErrorCategory.UNKNOWN_ERROR);
        expect(classified.technicalMessage).toContain('錯誤');
      });
    });
  });

  describe('formatErrorForUser()', () => {
    describe('Timeout Error Formatting', () => {
      test('should format timeout error with correct title and suggestions', () => {
        const error = new Error('Request timeout');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('處理超時');
        expect(formatted.message).toContain('處理您的問題時發生超時');
        expect(formatted.suggestions).toContain('• 縮短問題長度並重試');
        expect(formatted.suggestions).toContain('• 嘗試使用較快的模型（Sonar Pro）');
        expect(formatted.suggestions).toContain('• 簡化您的問題，一次只問一個重點');
      });
    });

    describe('Rate Limit Error Formatting', () => {
      test('should format rate limit error with correct suggestions', () => {
        const error = new Error('Rate limit exceeded');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('請求限制');
        expect(formatted.message).toContain('API 請求次數已達上限');
        expect(formatted.suggestions).toContain('• 等待片刻後再試（建議等待 1-2 分鐘）');
      });
    });

    describe('Authentication Error Formatting', () => {
      test('should format authentication error with correct suggestions', () => {
        const error = new Error('401 Unauthorized');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('認證失敗');
        expect(formatted.message).toContain('API 認證失敗');
        expect(formatted.suggestions).toContain('• 聯繫管理員檢查 API 配置');
        expect(formatted.suggestions).toContain('• 如問題持續，請聯繫技術支持');
      });
    });

    describe('Network Error Formatting', () => {
      test('should format network error with correct suggestions', () => {
        const error = new Error('ECONNREFUSED');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('網絡錯誤');
        expect(formatted.message).toContain('網絡連接失敗');
        expect(formatted.suggestions).toContain('• 檢查網絡連接是否正常');
        expect(formatted.suggestions).toContain('• 點擊重試按鈕再次嘗試');
      });
    });

    describe('API Error Formatting', () => {
      test('should format API error with correct title', () => {
        const error = new Error('HTTP 500 Internal Server Error');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('API 錯誤');
        expect(formatted.message).toBeDefined();
      });
    });

    describe('Validation Error Formatting', () => {
      test('should format validation error with no retry suggestion', () => {
        const error = new Error('Validation failed');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.suggestions).toContain('• 簡化您的問題，一次只問一個重點');
      });
    });

    describe('Streaming Error Formatting', () => {
      test('should format streaming error correctly', () => {
        const error = new Error('Stream interrupted');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBeDefined();
        expect(formatted.suggestions).toContain('• 點擊重試按鈕再次嘗試');
      });
    });

    describe('Unknown Error Formatting', () => {
      test('should format unknown error with generic message', () => {
        const error = new Error('Unknown problem');
        const classified = classifyError(error);
        const formatted = formatErrorForUser(classified);

        expect(formatted.title).toBe('處理錯誤');
        expect(formatted.suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('Recovery Actions Mapping', () => {
      test('should map RETRY_SAME_MODEL action correctly', () => {
        const classified: ClassifiedError = {
          category: PerplexityErrorCategory.NETWORK_ERROR,
          originalError: new Error('Test'),
          userMessage: 'Test message',
          technicalMessage: 'Test technical',
          recoveryActions: [RecoveryAction.RETRY_SAME_MODEL],
          shouldRetry: true,
        };

        const formatted = formatErrorForUser(classified);
        expect(formatted.suggestions).toContain('• 點擊重試按鈕再次嘗試');
      });

      test('should map RETRY_FALLBACK_MODEL action correctly', () => {
        const classified: ClassifiedError = {
          category: PerplexityErrorCategory.TIMEOUT,
          originalError: new Error('Test'),
          userMessage: 'Test message',
          technicalMessage: 'Test technical',
          recoveryActions: [RecoveryAction.RETRY_FALLBACK_MODEL],
          shouldRetry: true,
        };

        const formatted = formatErrorForUser(classified);
        expect(formatted.suggestions).toContain('• 嘗試使用較快的模型（Sonar Pro）');
      });

      test('should provide default suggestion when no actions specified', () => {
        const classified: ClassifiedError = {
          category: PerplexityErrorCategory.UNKNOWN_ERROR,
          originalError: new Error('Test'),
          userMessage: 'Test message',
          technicalMessage: 'Test technical',
          recoveryActions: [],
          shouldRetry: true,
        };

        const formatted = formatErrorForUser(classified);
        expect(formatted.suggestions).toContain('• 請稍後重試');
      });
    });
  });

  describe('Error Properties Validation', () => {
    test('timeout errors should have correct retry configuration', () => {
      const error = new Error('timeout');
      const classified = classifyError(error);

      expect(classified.shouldRetry).toBe(true);
      expect(classified.retryDelay).toBe(2000);
      expect(classified.fallbackModel).toBe('sonar-pro');
    });

    test('rate limit errors should have 60 second retry delay', () => {
      const error = new Error('rate limit');
      const classified = classifyError(error);

      expect(classified.shouldRetry).toBe(true);
      expect(classified.retryDelay).toBe(60000);
    });

    test('authentication errors should never retry', () => {
      const error = new Error('401');
      const classified = classifyError(error);

      expect(classified.shouldRetry).toBe(false);
      expect(classified.retryDelay).toBeUndefined();
    });

    test('network errors should have 3 second retry delay', () => {
      const error = new Error('ECONNREFUSED');
      const classified = classifyError(error);

      expect(classified.shouldRetry).toBe(true);
      expect(classified.retryDelay).toBe(3000);
    });

    test('validation errors should never retry', () => {
      const error = new Error('validation failed');
      const classified = classifyError(error);

      expect(classified.shouldRetry).toBe(false);
    });
  });
});
