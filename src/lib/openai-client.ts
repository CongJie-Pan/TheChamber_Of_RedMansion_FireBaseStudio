/**
 * @fileOverview OpenAI Client Configuration for GPT-5-Mini Integration
 *
 * This module provides a configured OpenAI client instance for use throughout
 * the daily tasks system. It handles API key management, timeout configuration,
 * and error handling for GPT-5-Mini API calls.
 *
 * Key features:
 * - Centralized OpenAI client initialization
 * - Environment-based API key management
 * - Timeout configuration for API calls
 * - Type-safe response interfaces
 * - Error handling utilities
 *
 * Usage:
 * ```typescript
 * import { openaiClient, generateCompletion } from '@/lib/openai-client';
 *
 * const feedback = await generateCompletion({
 *   model: 'gpt-5-mini',
 *   input: 'Analyze this answer...',
 * });
 * ```
 *
 * @phase Phase 2.8.1 - OpenAI Client Initialization
 */

import OpenAI from 'openai';

/**
 * OpenAI API configuration constants
 */
const OPENAI_CONFIG = {
  // API timeout in milliseconds (10 seconds)
  timeout: 10000,
  // Maximum retries for failed requests
  maxRetries: 2,
  // Default model for completions (GPT-5-Mini)
  defaultModel: 'gpt-5-mini',
} as const;

/**
 * Validate that OpenAI API key is configured
 * @throws Error if API key is missing
 */
function validateApiKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please add it to your .env.local file.\n' +
      'Get your API key from: https://platform.openai.com/api-keys'
    );
  }
}

/**
 * Initialize OpenAI client with configuration
 * Only initialize if API key is present (server-side only)
 */
let openaiClient: OpenAI | null = null;

try {
  // Diagnostic logging: OpenAI client initialization
  console.log('\n' + '━'.repeat(80));
  console.log('🔧 [OpenAI Client] Starting initialization');
  console.log('━'.repeat(80));
  console.log(`🔍 [Environment Check] Window type: ${typeof window === 'undefined' ? 'undefined (Server-side ✅)' : 'defined (Client-side ⚠️)'}`);
  console.log(`🔍 [Environment Variable] OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? `✅ Configured (length: ${process.env.OPENAI_API_KEY.length})` : '❌ Not configured'}`);
  console.log(`🔍 [Configuration] Timeout: ${OPENAI_CONFIG.timeout}ms, Max Retries: ${OPENAI_CONFIG.maxRetries}`);

  // Only initialize on server-side (API key should not be exposed to client)
  if (typeof window === 'undefined' && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_CONFIG.timeout,
      maxRetries: OPENAI_CONFIG.maxRetries,
    });
    console.log('✅ [Success] OpenAI client initialized successfully');
    console.log('━'.repeat(80) + '\n');
  } else {
    if (typeof window !== 'undefined') {
      console.warn('⚠️ [Skipped] Client-side environment, not initializing OpenAI client');
    } else if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [Error] OPENAI_API_KEY environment variable not set');
    }
    console.log('━'.repeat(80) + '\n');
  }
} catch (error) {
  console.error('\n' + '━'.repeat(80));
  console.error('❌ [Failed] Failed to initialize OpenAI client');
  console.error('━'.repeat(80));
  console.error('Error details:', error);
  console.error('━'.repeat(80) + '\n');
}

/**
 * Get OpenAI client instance
 * @throws Error if client is not initialized or API key is missing
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    validateApiKey();
    throw new Error('OpenAI client is not initialized. This should only be called on server-side.');
  }
  return openaiClient;
}

/**
 * Type definition for GPT-5-Mini completion response
 */
export interface GPT5MiniResponse {
  output_text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Type definition for completion request parameters
 */
export interface CompletionParams {
  model?: string;
  input: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Generate a completion using GPT-5-Mini (or GPT-4o-mini)
 *
 * @param params - Completion parameters
 * @returns Promise with completion response
 * @throws Error if API call fails
 */
export async function generateCompletion(
  params: CompletionParams
): Promise<GPT5MiniResponse> {
  const client = getOpenAIClient();
  const startTime = Date.now();

  try {
    // 📤 記錄請求詳情
    console.log('\n' + '='.repeat(80));
    console.log('🤖 [GPT-5-Mini] 發送請求');
    console.log('='.repeat(80));
    console.log(`📋 模型: ${params.model || OPENAI_CONFIG.defaultModel}`);
    console.log(`🌡️  溫度: ${params.temperature ?? 'default (1.0)'}`);
    console.log(`📏 最大 Tokens: ${params.max_tokens ?? 'default'}`);
    console.log(`⏰ 請求時間: ${new Date().toLocaleString('zh-TW')}`);
    console.log('\n📝 輸入 Prompt (前500字):');
    console.log('-'.repeat(80));
    console.log(params.input.substring(0, 500));
    if (params.input.length > 500) {
      console.log(`\n... (還有 ${params.input.length - 500} 個字元，總長度: ${params.input.length})`);
    }
    console.log('-'.repeat(80));

    // Use the correct OpenAI Chat Completions API
    const response = await client.chat.completions.create({
      model: params.model || OPENAI_CONFIG.defaultModel, // Use gpt-5-mini as default
      messages: [
        {
          role: 'user',
          content: params.input,
        },
      ],
      // Optional parameters
      ...(params.temperature !== undefined && { temperature: params.temperature }),
      ...(params.max_tokens !== undefined && { max_tokens: params.max_tokens }),
    });

    // Extract response content from the correct structure
    const content = response.choices[0]?.message?.content || '';
    const duration = Date.now() - startTime;

    // 📥 記錄回應詳情
    console.log('\n✅ [GPT-5-Mini] 收到回應');
    console.log('='.repeat(80));
    console.log(`⏱️  執行時間: ${duration}ms`);
    console.log(`🎯 實際模型: ${response.model}`);
    console.log(`⏰ 完成時間: ${new Date().toLocaleString('zh-TW')}`);

    if (response.usage) {
      console.log('\n📊 Token 使用量:');
      console.log(`   • 輸入 Tokens: ${response.usage.prompt_tokens}`);
      console.log(`   • 輸出 Tokens: ${response.usage.completion_tokens}`);
      console.log(`   • 總計 Tokens: ${response.usage.total_tokens}`);
    }

    console.log('\n💬 GPT-5-Mini 完整回應內容:');
    console.log('-'.repeat(80));
    console.log(content);
    console.log('-'.repeat(80));
    console.log('='.repeat(80) + '\n');

    return {
      output_text: content,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('\n' + '='.repeat(80));
    console.error('❌ [GPT-5-Mini] API 呼叫失敗');
    console.error('='.repeat(80));
    console.error(`⏱️  失敗時間: ${duration}ms`);
    console.error(`❌ 錯誤訊息:`, error);
    console.error('='.repeat(80) + '\n');
    throw new Error(
      `Failed to generate completion: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if OpenAI client is available
 * Useful for graceful degradation when API is not configured
 */
export function isOpenAIAvailable(): boolean {
  return openaiClient !== null && !!process.env.OPENAI_API_KEY;
}

/**
 * Generate a completion with timeout and fallback
 *
 * @param params - Completion parameters
 * @param fallbackValue - Value to return if API call fails or times out
 * @param timeoutMs - Custom timeout in milliseconds (optional)
 * @returns Promise with completion response or fallback value
 */
export async function generateCompletionWithFallback<T>(
  params: CompletionParams,
  fallbackValue: T,
  timeoutMs?: number
): Promise<GPT5MiniResponse | T> {
  // Check if OpenAI is available
  if (!isOpenAIAvailable()) {
    console.warn('⚠️ OpenAI not available, using fallback value');
    return fallbackValue;
  }

  const timeout = timeoutMs || OPENAI_CONFIG.timeout;

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<T>((resolve) => {
      setTimeout(() => {
        console.warn(`⚠️ OpenAI API call timed out after ${timeout}ms, using fallback`);
        resolve(fallbackValue);
      }, timeout);
    });

    // Race between API call and timeout
    const result = await Promise.race([
      generateCompletion(params),
      timeoutPromise,
    ]);

    return result;
  } catch (error) {
    console.error('❌ OpenAI API call failed, using fallback:', error);
    return fallbackValue;
  }
}

/**
 * Export configuration constants for external use
 */
export const OPENAI_CONSTANTS = {
  ...OPENAI_CONFIG,
} as const;

// Export the client instance (for advanced use cases)
export { openaiClient };
