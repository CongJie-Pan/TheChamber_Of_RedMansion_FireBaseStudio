/**
 * @fileOverview Type definitions for Perplexity-powered QA system
 * 
 * This file contains all TypeScript interfaces and types for the Perplexity Sonar API
 * integration, providing comprehensive type safety for the Red Mansion learning platform.
 */

import type { PerplexityModelKey, ReasoningEffort, QuestionContext } from '@/ai/perplexity-config';

/**
 * Core citation information from Perplexity responses
 * Perplexity 回應中的引用資訊
 */
export interface PerplexityCitation {
  /** Citation number/index (1, 2, 3, etc.) */
  number: string;
  /** Source title or description */
  title: string;
  /** Source URL */
  url: string;
  /** Citation type */
  type: 'web_citation' | 'default' | 'academic' | 'news';
  /** Snippet or excerpt from the source */
  snippet?: string;
  /** Publication date if available */
  publishDate?: string;
  /** Domain of the source */
  domain?: string;
}

/**
 * Grounding metadata from Perplexity API responses
 * Perplexity API 回應的接地元數據
 */
export interface PerplexityGroundingMetadata {
  /** Search queries used by Perplexity */
  searchQueries: string[];
  /** Web sources found and used */
  webSources: PerplexityCitation[];
  /** Grounding confidence score (0-1) */
  confidenceScore?: number;
  /** Whether grounding was successful */
  groundingSuccessful: boolean;
  /** Additional metadata from API */
  rawMetadata?: Record<string, any>;
}

/**
 * Input schema for Perplexity QA requests
 * Perplexity QA 請求的輸入結構
 */
export interface PerplexityQAInput {
  /** User's question about Dream of the Red Chamber */
  userQuestion: string;
  /** Selected text snippet (optional) */
  selectedText?: string;
  /** Context from current chapter */
  chapterContext?: string;
  /** Current chapter name/number */
  currentChapter?: string;
  /** Preferred model to use */
  modelKey?: PerplexityModelKey;
  /** Reasoning effort level (for reasoning models) */
  reasoningEffort?: ReasoningEffort;
  /** Question context type for specialized prompts */
  questionContext?: QuestionContext;
  /** Enable streaming response */
  enableStreaming?: boolean;
  /** Include detailed citations */
  includeDetailedCitations?: boolean;
  /** Show AI thinking process */
  showThinkingProcess?: boolean;
  /** Custom temperature (0-1) */
  temperature?: number;
  /** Maximum tokens in response */
  maxTokens?: number;
}

/**
 * Complete response from Perplexity QA system
 * Perplexity QA 系統的完整回應
 */
export interface PerplexityQAResponse {
  /** Original user question */
  question: string;
  /** AI-generated answer (cleaned and formatted) */
  answer: string;
  /** Raw answer from API (before cleaning) */
  rawAnswer?: string;
  /** Citation information */
  citations: PerplexityCitation[];
  /** Grounding metadata */
  groundingMetadata: PerplexityGroundingMetadata;
  /** Model configuration used */
  modelUsed: string;
  /** Model key used */
  modelKey: PerplexityModelKey;
  /** Reasoning effort applied */
  reasoningEffort?: ReasoningEffort;
  /** Question context type */
  questionContext?: QuestionContext;
  /** Processing time in seconds */
  processingTime: number;
  /** Whether request was successful */
  success: boolean;
  /** Was streaming enabled */
  streaming: boolean;
  /** Number of streaming chunks received */
  chunkCount?: number;
  /** Whether response was stopped by user */
  stoppedByUser?: boolean;
  /** Response timestamp */
  timestamp: string;
  /** Answer length in characters */
  answerLength: number;
  /** Question length in characters */
  questionLength: number;
  /** Number of citations found */
  citationCount: number;
  /** Error information if request failed */
  error?: string;
  /** Additional response metadata */
  metadata?: Record<string, any>;
}

/**
 * Streaming chunk data structure
 * 流式回應的區塊資料結構
 */
export interface PerplexityStreamingChunk {
  /** Incremental content */
  content: string;
  /** Full content up to this point */
  fullContent: string;
  /** Extracted thinking content from <think>…</think> */
  thinkingContent?: string;
  /** Whether displayed answer text was derived from thinking fallback */
  contentDerivedFromThinking?: boolean;
  /** Chunk timestamp */
  timestamp: string;
  /** Associated citations (may be partial) */
  citations: PerplexityCitation[];
  /** Search queries identified so far */
  searchQueries: string[];
  /** Grounding metadata (may be incomplete) */
  metadata: Partial<PerplexityGroundingMetadata>;
  /** Processing time up to this chunk */
  responseTime: number;
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Error information if chunk processing failed */
  error?: string;
  /** Chunk sequence number */
  chunkIndex: number;
  /** Whether thinking process is included */
  hasThinkingProcess?: boolean;
}

/**
 * Batch processing input for multiple questions
 * 批量處理多個問題的輸入結構
 */
export interface PerplexityBatchQAInput {
  /** Array of individual QA inputs */
  questions: PerplexityQAInput[];
  /** Shared model configuration */
  sharedConfig?: Partial<PerplexityQAInput>;
  /** Maximum concurrent requests */
  maxConcurrency?: number;
  /** Timeout for entire batch (seconds) */
  batchTimeout?: number;
}

/**
 * Batch processing response
 * 批量處理回應結構
 */
export interface PerplexityBatchQAResponse {
  /** Array of individual responses */
  responses: PerplexityQAResponse[];
  /** Batch processing metadata */
  batchMetadata: {
    totalQuestions: number;
    successfulQuestions: number;
    failedQuestions: number;
    totalProcessingTime: number;
    averageProcessingTime: number;
    timestamp: string;
  };
  /** Overall batch success status */
  success: boolean;
  /** Batch-level errors */
  errors?: string[];
}

/**
 * Configuration for Perplexity QA operations
 * Perplexity QA 操作的配置
 */
export interface PerplexityQAConfig {
  /** Default model to use */
  defaultModel: PerplexityModelKey;
  /** Default reasoning effort */
  defaultReasoningEffort: ReasoningEffort;
  /** Default question context */
  defaultQuestionContext: QuestionContext;
  /** Default temperature */
  defaultTemperature: number;
  /** Default max tokens */
  defaultMaxTokens: number;
  /** Enable streaming by default */
  enableStreamingByDefault: boolean;
  /** Include detailed citations by default */
  includeDetailedCitationsByDefault: boolean;
  /** Show thinking process by default */
  showThinkingProcessByDefault: boolean;
  /** Request timeout in milliseconds */
  requestTimeoutMs: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Enable fallback to simpler model on failure */
  enableFallback: boolean;
  /** Fallback model */
  fallbackModel: PerplexityModelKey;
}

/**
 * Error types for Perplexity QA operations
 * Perplexity QA 操作的錯誤類型
 */
export class PerplexityQAError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    retryable: boolean = false,
    originalError?: Error
  ) {
    super(message);
    this.name = 'PerplexityQAError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

/**
 * Default configuration values
 * 預設配置值
 */
export const DEFAULT_PERPLEXITY_QA_CONFIG: PerplexityQAConfig = {
  defaultModel: 'sonar-reasoning-pro',
  defaultReasoningEffort: 'high',
  defaultQuestionContext: 'general',
  defaultTemperature: 0.2,
  defaultMaxTokens: 2000,
  enableStreamingByDefault: true,
  includeDetailedCitationsByDefault: true,
  showThinkingProcessByDefault: true,
  requestTimeoutMs: 60000,
  maxRetries: 3,
  enableFallback: true,
  fallbackModel: 'sonar-pro',
};

/**
 * Helper function to create Perplexity QA input with defaults
 * 創建帶有預設值的 Perplexity QA 輸入的輔助函數
 */
export function createPerplexityQAInput(
  userQuestion: string,
  options?: Partial<PerplexityQAInput>
): PerplexityQAInput {
  return {
    userQuestion,
    modelKey: DEFAULT_PERPLEXITY_QA_CONFIG.defaultModel,
    reasoningEffort: DEFAULT_PERPLEXITY_QA_CONFIG.defaultReasoningEffort,
    questionContext: DEFAULT_PERPLEXITY_QA_CONFIG.defaultQuestionContext,
    enableStreaming: DEFAULT_PERPLEXITY_QA_CONFIG.enableStreamingByDefault,
    includeDetailedCitations: DEFAULT_PERPLEXITY_QA_CONFIG.includeDetailedCitationsByDefault,
    showThinkingProcess: DEFAULT_PERPLEXITY_QA_CONFIG.showThinkingProcessByDefault,
    temperature: DEFAULT_PERPLEXITY_QA_CONFIG.defaultTemperature,
    maxTokens: DEFAULT_PERPLEXITY_QA_CONFIG.defaultMaxTokens,
    ...options,
  };
}

/**
 * Helper function to validate Perplexity QA input
 * 驗證 Perplexity QA 輸入的輔助函數
 */
export function validatePerplexityQAInput(input: PerplexityQAInput): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.userQuestion || input.userQuestion.trim().length === 0) {
    errors.push('User question is required and cannot be empty');
  }

  if (input.userQuestion && input.userQuestion.length > 1000) {
    errors.push('User question is too long (maximum 1000 characters)');
  }

  if (input.temperature !== undefined && (input.temperature < 0 || input.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1');
  }

  if (input.maxTokens !== undefined && (input.maxTokens < 1 || input.maxTokens > 8000)) {
    errors.push('Max tokens must be between 1 and 8000');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard to check if response has citations
 * 檢查回應是否包含引用的類型守護
 */
export function hasPerplexityCitations(
  response: PerplexityQAResponse
): response is PerplexityQAResponse & { citations: PerplexityCitation[] } {
  return Array.isArray(response.citations) && response.citations.length > 0;
}

/**
 * Type guard to check if response has grounding metadata
 * 檢查回應是否包含接地元數據的類型守護
 */
export function hasGroundingMetadata(
  response: PerplexityQAResponse
): response is PerplexityQAResponse & { groundingMetadata: PerplexityGroundingMetadata } {
  return Boolean(response.groundingMetadata && response.groundingMetadata.groundingSuccessful);
}
