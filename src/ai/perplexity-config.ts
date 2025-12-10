/**
 * @fileOverview Perplexity AI configuration for the Red Mansion learning platform.
 *
 * This file provides configuration and constants for integrating Perplexity Sonar API
 * to power AI-driven features including:
 * - Text analysis and explanations for classical Chinese literature
 * - Real-time web search grounding for accurate and cited responses
 * - Enhanced reasoning capabilities through sonar-reasoning models
 * - Streaming responses for better user experience
 *
 * @note CORS Limitation (aligned with LobeChat pattern):
 * Perplexity API does NOT support browser CORS requests. All API calls must be made
 * from server-side code (API routes, Server Components, Server Actions).
 * This is why we use Next.js API routes (/api/perplexity-qa-stream) as a proxy.
 * See: LobeChat's `disableBrowserRequest: true` setting for Perplexity provider.
 *
 * @note Temperature Constraint (aligned with LobeChat pattern):
 * Perplexity API requires temperature < 2. Values >= 2 should be treated as undefined.
 * This is enforced in createPerplexityConfig().
 *
 * @updated 2025-11-27 - Added LobeChat alignment (models, constraints, documentation)
 */

/**
 * Available Perplexity Sonar models with their capabilities
 * 可用的 Perplexity Sonar 模型及其功能特性
 */
export const PERPLEXITY_MODELS = {
  'sonar-pro': {
    name: 'sonar-pro',
    displayName: 'Sonar Pro 快速模型',
    description: '快速回應，適合一般問答',
    features: ['web_search', 'citations'],
    maxTokens: 4000,
    supportsReasoning: false,
  },
  'sonar-reasoning': {
    name: 'sonar-reasoning',
    displayName: 'Sonar 推理模型',
    description: '增強推理能力，適合複雜分析',
    features: ['web_search', 'citations', 'reasoning', 'thinking_process'],
    maxTokens: 8000,
    supportsReasoning: true,
  },
  'sonar-reasoning-pro': {
    name: 'sonar-reasoning-pro',
    displayName: 'Sonar 進階推理模型',
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
  DEFAULT_REASONING_EFFORT: 'medium' as ReasoningEffort,
  DEFAULT_TEMPERATURE: 0.2,
  DEFAULT_MAX_TOKENS: 4500,
  
  // Request settings
  REQUEST_TIMEOUT_MS: 60000, // 60 seconds (standard models timeout)
  REASONING_MODEL_TIMEOUT_MS: 180000, // 180 seconds (3 minutes for reasoning models)
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,

  // Adaptive timeout configuration
  ADAPTIVE_TIMEOUT: {
    BASE_TIMEOUT: 45000,           // 45 seconds base
    REASONING_MULTIPLIER: 1.5,     // 1.5x for reasoning models
    COMPLEX_QUESTION_BONUS: 30000, // +30s for complex questions
    MAX_TIMEOUT: 120000,           // 2 minutes maximum
    MIN_TIMEOUT: 30000,            // 30 seconds minimum
  },
  
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
 *
 * @note Temperature Constraint (aligned with LobeChat pattern):
 * Perplexity API requires temperature < 2. If temperature >= 2, it is treated as undefined.
 * This prevents API errors and aligns with LobeChat's implementation.
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

  // Temperature constraint: Perplexity API requires temperature < 2
  // If >= 2, treat as undefined (let API use default)
  // Aligned with LobeChat pattern: finalTemperature = temperature >= 2 ? undefined : temperature
  const requestedTemperature = options?.temperature ?? PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE;
  const finalTemperature = requestedTemperature >= 2 ? undefined : requestedTemperature;

  const config: Record<string, any> = {
    model: modelConfig.name,
    max_tokens: Math.min(
      options?.maxTokens ?? PERPLEXITY_CONFIG.DEFAULT_MAX_TOKENS,
      modelConfig.maxTokens
    ),
    stream: options?.enableStreaming ?? false,
  };

  // Only include temperature if it's valid (< 2)
  if (finalTemperature !== undefined) {
    config.temperature = finalTemperature;
  }

  // Add reasoning effort for reasoning-capable models
  if (supportsReasoning(modelKey) && options?.reasoningEffort) {
    config.reasoning_effort = options.reasoningEffort;
  }

  return config;
}

/**
 * Calculate adaptive timeout based on question complexity and model type
 * 根據問題複雜度和模型類型計算自適應超時時間
 *
 * Reason: Different questions and models require different processing times.
 * Reasoning models need more time, and complex questions need additional buffer.
 */
export function calculateAdaptiveTimeout(options: {
  modelKey: PerplexityModelKey;
  reasoningEffort?: ReasoningEffort;
  questionLength?: number;
  questionContext?: QuestionContext;
}): number {
  const { BASE_TIMEOUT, REASONING_MULTIPLIER, COMPLEX_QUESTION_BONUS, MAX_TIMEOUT, MIN_TIMEOUT } =
    PERPLEXITY_CONFIG.ADAPTIVE_TIMEOUT;

  let timeout = BASE_TIMEOUT;

  // Apply reasoning multiplier for reasoning models
  if (supportsReasoning(options.modelKey)) {
    timeout *= REASONING_MULTIPLIER;

    // Additional time for high reasoning effort
    if (options.reasoningEffort === 'high') {
      timeout += 15000; // +15 seconds for high reasoning
    } else if (options.reasoningEffort === 'medium') {
      timeout += 7500; // +7.5 seconds for medium reasoning
    }
  }

  // Add bonus for complex questions (long questions are typically more complex)
  if (options.questionLength && options.questionLength > 200) {
    timeout += COMPLEX_QUESTION_BONUS;
  } else if (options.questionLength && options.questionLength > 100) {
    timeout += COMPLEX_QUESTION_BONUS / 2; // Half bonus for medium-length questions
  }

  // Context-specific adjustments
  if (options.questionContext === 'theme' || options.questionContext === 'character') {
    timeout += 10000; // +10 seconds for deep analysis contexts
  }

  // Clamp to min/max bounds
  return Math.max(MIN_TIMEOUT, Math.min(MAX_TIMEOUT, timeout));
}

/**
 * Get timeout configuration summary for logging
 * 獲取超時配置摘要用於日誌記錄
 */
export function getTimeoutSummary(timeout: number): {
  seconds: number;
  minutes: number;
  formatted: string;
} {
  const seconds = Math.round(timeout / 1000);
  const minutes = Math.round((timeout / 1000 / 60) * 10) / 10;
  const formatted = minutes >= 1
    ? `${minutes} 分鐘`
    : `${seconds} 秒`;

  return { seconds, minutes, formatted };
}
