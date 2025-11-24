/**
 * @fileOverview Centralized Error Handler for Perplexity QA
 *
 * Comprehensive error handling system with:
 * - Error classification (timeout, rate limit, API error, network error)
 * - User-friendly error messages with context
 * - Actionable recovery suggestions
 * - Retry strategy recommendations
 * - Comprehensive logging for debugging
 *
 * Implements reliability improvements from Phase 3
 */

import type { PerplexityModelKey, ReasoningEffort } from '@/ai/perplexity-config';

/**
 * Error categories for classification
 */
export enum PerplexityErrorCategory {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  STREAMING_ERROR = 'STREAMING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Recovery action types
 */
export enum RecoveryAction {
  RETRY_SAME_MODEL = 'RETRY_SAME_MODEL',
  RETRY_FALLBACK_MODEL = 'RETRY_FALLBACK_MODEL',
  RETRY_WITH_REDUCED_TIMEOUT = 'RETRY_WITH_REDUCED_TIMEOUT',
  SIMPLIFY_QUESTION = 'SIMPLIFY_QUESTION',
  WAIT_AND_RETRY = 'WAIT_AND_RETRY',
  CHECK_NETWORK = 'CHECK_NETWORK',
  CHECK_API_KEY = 'CHECK_API_KEY',
  CONTACT_SUPPORT = 'CONTACT_SUPPORT',
  NO_RETRY = 'NO_RETRY',
}

/**
 * Classified error result
 */
export interface ClassifiedError {
  /** Error category */
  category: PerplexityErrorCategory;

  /** Original error object */
  originalError: Error | unknown;

  /** User-friendly error message (Traditional Chinese) */
  userMessage: string;

  /** Technical error message (for logging) */
  technicalMessage: string;

  /** Suggested recovery actions */
  recoveryActions: RecoveryAction[];

  /** Whether retry is recommended */
  shouldRetry: boolean;

  /** Recommended retry delay (milliseconds) */
  retryDelay?: number;

  /** Fallback model suggestion */
  fallbackModel?: PerplexityModelKey;

  /** Additional context for debugging */
  context?: Record<string, any>;
}

/**
 * Classify error and provide recovery strategy
 *
 * Reason: Centralized error classification enables consistent error handling
 * across the application and provides users with actionable feedback.
 */
export function classifyError(
  error: Error | unknown,
  context?: {
    modelKey?: PerplexityModelKey;
    reasoningEffort?: ReasoningEffort;
    questionLength?: number;
    attemptNumber?: number;
  }
): ClassifiedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  const normalizedErrorMessage = errorMessage.toLowerCase();

  // Rate limit errors (checked first - more specific than "exceeded")
  if (
    normalizedErrorMessage.includes('rate limit') ||
    normalizedErrorMessage.includes('429') ||
    normalizedErrorMessage.includes('too many requests')
  ) {
    return {
      category: PerplexityErrorCategory.RATE_LIMIT,
      originalError: error,
      userMessage: 'API 請求次數已達上限，請稍候再試。通常需要等待 1-2 分鐘。',
      technicalMessage: `Rate limit error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.WAIT_AND_RETRY],
      shouldRetry: true,
      retryDelay: 60000, // 60 seconds
      context,
    };
  }

  // Timeout errors
  if (
    normalizedErrorMessage.includes('timeout') ||
    normalizedErrorMessage.includes('etimedout') ||
    normalizedErrorMessage.includes('exceeded')
  ) {
    return {
      category: PerplexityErrorCategory.TIMEOUT,
      originalError: error,
      userMessage: '處理您的問題時發生超時。這可能是因為問題較為複雜，需要更多時間分析。',
      technicalMessage: `Timeout error: ${errorMessage}`,
      recoveryActions: [
        RecoveryAction.RETRY_WITH_REDUCED_TIMEOUT,
        RecoveryAction.RETRY_FALLBACK_MODEL,
        RecoveryAction.SIMPLIFY_QUESTION,
      ],
      shouldRetry: true,
      retryDelay: 2000,
      fallbackModel: 'sonar-pro',
      context,
    };
  }

  // Authentication errors
  if (
    normalizedErrorMessage.includes('401') ||
    normalizedErrorMessage.includes('unauthorized') ||
    normalizedErrorMessage.includes('authentication') ||
    normalizedErrorMessage.includes('api key')
  ) {
    return {
      category: PerplexityErrorCategory.AUTHENTICATION_ERROR,
      originalError: error,
      userMessage: 'API 認證失敗，請檢查系統配置或聯繫管理員。',
      technicalMessage: `Authentication error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.CHECK_API_KEY, RecoveryAction.CONTACT_SUPPORT],
      shouldRetry: false,
      context,
    };
  }

  // Network errors
  if (
    normalizedErrorMessage.includes('econnrefused') ||
    normalizedErrorMessage.includes('enotfound') ||
    normalizedErrorMessage.includes('network') ||
    normalizedErrorMessage.includes('fetch failed')
  ) {
    return {
      category: PerplexityErrorCategory.NETWORK_ERROR,
      originalError: error,
      userMessage: '網絡連接失敗，請檢查您的網絡連接後重試。',
      technicalMessage: `Network error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.CHECK_NETWORK, RecoveryAction.RETRY_SAME_MODEL],
      shouldRetry: true,
      retryDelay: 3000,
      context,
    };
  }

  // Validation errors
  if (
    normalizedErrorMessage.includes('validation') ||
    normalizedErrorMessage.includes('invalid') ||
    errorName === 'ValidationError'
  ) {
    return {
      category: PerplexityErrorCategory.VALIDATION_ERROR,
      originalError: error,
      userMessage: '輸入驗證失敗，請檢查您的問題格式後重試。',
      technicalMessage: `Validation error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.SIMPLIFY_QUESTION, RecoveryAction.NO_RETRY],
      shouldRetry: false,
      context,
    };
  }

  // Streaming errors
  if (
    normalizedErrorMessage.includes('stream') ||
    normalizedErrorMessage.includes('async iterable') ||
    normalizedErrorMessage.includes('sse')
  ) {
    return {
      category: PerplexityErrorCategory.STREAMING_ERROR,
      originalError: error,
      userMessage: '流式傳輸失敗，將嘗試使用標準模式重試。',
      technicalMessage: `Streaming error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.RETRY_SAME_MODEL],
      shouldRetry: true,
      retryDelay: 1000,
      context,
    };
  }

  // API errors (4xx, 5xx)
  if (errorMessage.match(/[45]\d{2}/)) {
    return {
      category: PerplexityErrorCategory.API_ERROR,
      originalError: error,
      userMessage: 'API 服務暫時無法使用，請稍後重試。',
      technicalMessage: `API error: ${errorMessage}`,
      recoveryActions: [RecoveryAction.RETRY_FALLBACK_MODEL, RecoveryAction.WAIT_AND_RETRY],
      shouldRetry: true,
      retryDelay: 5000,
      fallbackModel: 'sonar-pro',
      context,
    };
  }

  // Unknown errors (default fallback)
  return {
    category: PerplexityErrorCategory.UNKNOWN_ERROR,
    originalError: error,
    userMessage: '發生未知錯誤，請稍後重試。如果問題持續，請聯繫技術支持。',
    technicalMessage: `Unknown error: ${errorName} - ${errorMessage}`,
    recoveryActions: [RecoveryAction.RETRY_SAME_MODEL, RecoveryAction.CONTACT_SUPPORT],
    shouldRetry: true,
    retryDelay: 3000,
    context,
  };
}

/**
 * Format error for user display
 *
 * Converts classified error into user-friendly message with actionable suggestions
 */
export function formatErrorForUser(classifiedError: ClassifiedError): {
  title: string;
  message: string;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  // Add recovery action suggestions
  classifiedError.recoveryActions.forEach((action) => {
    switch (action) {
      case RecoveryAction.RETRY_SAME_MODEL:
        suggestions.push('• 點擊重試按鈕再次嘗試');
        break;
      case RecoveryAction.RETRY_FALLBACK_MODEL:
        suggestions.push('• 嘗試使用較快的模型（Sonar Pro）');
        break;
      case RecoveryAction.RETRY_WITH_REDUCED_TIMEOUT:
        suggestions.push('• 縮短問題長度並重試');
        break;
      case RecoveryAction.SIMPLIFY_QUESTION:
        suggestions.push('• 簡化您的問題，一次只問一個重點');
        break;
      case RecoveryAction.WAIT_AND_RETRY:
        suggestions.push('• 等待片刻後再試（建議等待 1-2 分鐘）');
        break;
      case RecoveryAction.CHECK_NETWORK:
        suggestions.push('• 檢查網絡連接是否正常');
        break;
      case RecoveryAction.CHECK_API_KEY:
        suggestions.push('• 聯繫管理員檢查 API 配置');
        break;
      case RecoveryAction.CONTACT_SUPPORT:
        suggestions.push('• 如問題持續，請聯繫技術支持');
        break;
    }
  });

  // Generate title based on category
  let title = '處理錯誤';
  switch (classifiedError.category) {
    case PerplexityErrorCategory.TIMEOUT:
      title = '處理超時';
      break;
    case PerplexityErrorCategory.RATE_LIMIT:
      title = '請求限制';
      break;
    case PerplexityErrorCategory.NETWORK_ERROR:
      title = '網絡錯誤';
      break;
    case PerplexityErrorCategory.AUTHENTICATION_ERROR:
      title = '認證失敗';
      break;
    case PerplexityErrorCategory.API_ERROR:
      title = 'API 錯誤';
      break;
  }

  return {
    title,
    message: classifiedError.userMessage,
    suggestions: suggestions.length > 0 ? suggestions : ['• 請稍後重試'],
  };
}

/**
 * Log error with comprehensive context
 *
 * Reason: Detailed logging helps with debugging and monitoring production issues
 */
export function logError(
  classifiedError: ClassifiedError,
  additionalContext?: Record<string, any>
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    category: classifiedError.category,
    technicalMessage: classifiedError.technicalMessage,
    shouldRetry: classifiedError.shouldRetry,
    retryDelay: classifiedError.retryDelay,
    fallbackModel: classifiedError.fallbackModel,
    recoveryActions: classifiedError.recoveryActions,
    context: {
      ...classifiedError.context,
      ...additionalContext,
    },
    errorStack: classifiedError.originalError instanceof Error
      ? classifiedError.originalError.stack
      : undefined,
  };

  // Log to console (in production, this would go to proper logging service)
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Perplexity Error Handler]', logData);
  }
}

/**
 * Determine if should retry based on attempt number and error type
 */
export function shouldAttemptRetry(
  classifiedError: ClassifiedError,
  attemptNumber: number,
  maxAttempts: number = 3
): boolean {
  if (!classifiedError.shouldRetry) {
    return false;
  }

  if (attemptNumber >= maxAttempts) {
    return false;
  }

  // Don't retry authentication errors
  if (classifiedError.category === PerplexityErrorCategory.AUTHENTICATION_ERROR) {
    return false;
  }

  // Don't retry validation errors
  if (classifiedError.category === PerplexityErrorCategory.VALIDATION_ERROR) {
    return false;
  }

  return true;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelay: number = 1000
): number {
  return Math.min(baseDelay * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
}
