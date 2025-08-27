/**
 * @fileOverview Perplexity AI configuration for the Red Mansion learning platform.
 * 
 * This file provides configuration and constants for integrating Perplexity Sonar API
 * to power AI-driven features including:
 * - Text analysis and explanations for classical Chinese literature  
 * - Real-time web search grounding for accurate and cited responses
 * - Enhanced reasoning capabilities through sonar-reasoning models
 * - Streaming responses for better user experience
 */

/**
 * Available Perplexity Sonar models with their capabilities
 * 可用的 Perplexity Sonar 模型及其功能特性
 */
export const PERPLEXITY_MODELS = {
  'sonar-pro': {
    name: 'sonar-pro',
    displayName: 'Sonar Pro',
    description: '快速回應，適合一般問答',
    features: ['web_search', 'citations'],
    maxTokens: 4000,
    supportsReasoning: false,
  },
  'sonar-reasoning': {
    name: 'sonar-reasoning', 
    displayName: 'Sonar Reasoning',
    description: '增強推理能力，適合複雜分析',
    features: ['web_search', 'citations', 'reasoning', 'thinking_process'],
    maxTokens: 8000,
    supportsReasoning: true,
  },
  'sonar-reasoning-pro': {
    name: 'sonar-reasoning-pro',
    displayName: 'Sonar Reasoning Pro',
    description: '最強推理能力，適合深度文學分析',
    features: ['web_search', 'citations', 'advanced_reasoning', 'thinking_process'],
    maxTokens: 8000,
    supportsReasoning: true,
  },
} as const;

export type PerplexityModelKey = keyof typeof PERPLEXITY_MODELS;

/**
 * Reasoning effort levels for reasoning-capable models
 * 推理強度等級設定
 */
export const REASONING_EFFORTS = {
  low: {
    value: 'low',
    displayName: '低強度',
    description: '快速回應，基礎推理',
    emoji: '🟢',
  },
  medium: {
    value: 'medium', 
    displayName: '中強度',
    description: '平衡速度與深度',
    emoji: '🟡',
  },
  high: {
    value: 'high',
    displayName: '高強度', 
    description: '深度推理分析',
    emoji: '🔴',
  },
} as const;

export type ReasoningEffort = keyof typeof REASONING_EFFORTS;

/**
 * Perplexity API configuration constants
 * Perplexity API 配置常數
 */
export const PERPLEXITY_CONFIG = {
  // API endpoints
  BASE_URL: 'https://api.perplexity.ai',
  CHAT_COMPLETIONS_ENDPOINT: '/chat/completions',
  
  // Default model settings
  DEFAULT_MODEL: 'sonar-reasoning-pro' as PerplexityModelKey,
  DEFAULT_REASONING_EFFORT: 'high' as ReasoningEffort,
  DEFAULT_TEMPERATURE: 0.2,
  DEFAULT_MAX_TOKENS: 2000,
  
  // Request settings
  REQUEST_TIMEOUT_MS: 60000, // 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  
  // Streaming settings
  STREAM_CHUNK_DELAY_MS: 50, // Delay between processing chunks
  STREAM_UPDATE_FREQUENCY: 15, // Update UI every N chunks
  
  // Citation settings
  MAX_CITATIONS: 10,
  CITATION_TIMEOUT_MS: 5000,
  ENABLE_CITATION_PARSING: true,
  
  // Response processing
  ENABLE_THINKING_PROCESS: true,
  CLEAN_HTML_TAGS: true,
  MAX_RESPONSE_LENGTH: 10000,
  
  // Error handling
  ENABLE_FALLBACK: true,
  FALLBACK_MODEL: 'sonar-pro' as PerplexityModelKey,
} as const;

/**
 * Question context types for specialized prompts
 * 問題情境類型，用於專門化提示
 */
export const QUESTION_CONTEXTS = {
  character: {
    key: 'character',
    displayName: '人物分析',
    emoji: '👥',
    description: '專注於人物性格、關係和發展分析',
  },
  plot: {
    key: 'plot',
    displayName: '情節探討',
    emoji: '📖', 
    description: '重點分析情節發展、結構和敘事技巧',
  },
  theme: {
    key: 'theme',
    displayName: '主題思想',
    emoji: '🎭',
    description: '深入探討主題思想、象徵意義和文學價值',
  },
  general: {
    key: 'general',
    displayName: '綜合討論',
    emoji: '📚',
    description: '提供全面而深入的文學分析',
  },
} as const;

export type QuestionContext = keyof typeof QUESTION_CONTEXTS;

/**
 * Environment variable names for API configuration
 * API 配置的環境變數名稱
 */
export const ENV_VARS = {
  PERPLEXITY_API_KEY: 'PERPLEXITYAI_API_KEY',
  PERPLEXITY_BASE_URL: 'PERPLEXITY_BASE_URL',
  ENABLE_DEBUG_LOGGING: 'PERPLEXITY_DEBUG',
} as const;

/**
 * Helper function to get API key from environment
 * 從環境變數取得 API 金鑰的輔助函數
 */
export function getPerplexityApiKey(): string | undefined {
  return process.env[ENV_VARS.PERPLEXITY_API_KEY];
}

/**
 * Helper function to validate if API key is configured
 * 驗證 API 金鑰是否已配置的輔助函數
 */
export function isPerplexityConfigured(): boolean {
  const apiKey = getPerplexityApiKey();
  return Boolean(apiKey && apiKey.trim().length > 0);
}

/**
 * Helper function to get model configuration
 * 取得模型配置的輔助函數
 */
export function getModelConfig(modelKey: PerplexityModelKey) {
  return PERPLEXITY_MODELS[modelKey];
}

/**
 * Helper function to validate model supports reasoning
 * 驗證模型是否支援推理功能的輔助函數
 */
export function supportsReasoning(modelKey: PerplexityModelKey): boolean {
  return PERPLEXITY_MODELS[modelKey].supportsReasoning;
}

/**
 * Default request headers for Perplexity API
 * Perplexity API 的預設請求標頭
 */
export function getDefaultHeaders(apiKey?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey || getPerplexityApiKey()}`,
    'User-Agent': 'RedMansion-Learning-Platform/1.0',
  };
}

/**
 * Generate generation config for different use cases
 * 為不同使用情境生成配置的輔助函數
 */
export function createPerplexityConfig(options?: {
  model?: PerplexityModelKey;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
  enableStreaming?: boolean;
}) {
  const modelKey = options?.model || PERPLEXITY_CONFIG.DEFAULT_MODEL;
  const modelConfig = getModelConfig(modelKey);
  
  const config = {
    model: modelConfig.name,
    temperature: options?.temperature ?? PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE,
    max_tokens: Math.min(
      options?.maxTokens ?? PERPLEXITY_CONFIG.DEFAULT_MAX_TOKENS,
      modelConfig.maxTokens
    ),
    stream: options?.enableStreaming ?? false,
  };

  // Add reasoning effort for reasoning-capable models
  if (supportsReasoning(modelKey) && options?.reasoningEffort) {
    (config as any).reasoning_effort = options.reasoningEffort;
  }

  return config;
}
