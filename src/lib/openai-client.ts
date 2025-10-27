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
  // Default model for completions, can be overridden via env OPENAI_MODEL
  defaultModel: process.env.OPENAI_MODEL || 'gpt-5-mini',
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
  console.log(`🔍 [Model] Default model: ${OPENAI_CONFIG.defaultModel}${process.env.OPENAI_MODEL ? ' (from env OPENAI_MODEL)' : ''}`);

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
  // GPT-5-mini specific parameters
  verbosity?: 'low' | 'medium' | 'high';
  reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high';
}

const OPTIONAL_SAMPLING_KEYS = [
  'temperature',
  'top_p',
  'presence_penalty',
  'frequency_penalty',
  'reasoning_effort',
  'verbosity',
] as const;

interface BuildChatParamsOptions {
  stripOptionalParams?: boolean;
}

function usesResponsesAPI(model: string): boolean {
  const normalized = model.toLowerCase();
  return (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o4') ||
    normalized.startsWith('o3')
  );
}

function requiresMaxCompletionTokens(model: string): boolean {
  const normalized = model.toLowerCase();
  return (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('gpt-4o') ||
    normalized.startsWith('gpt-4.1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.includes('omni')
  );
}

function enforcesDefaultTemperature(model: string): boolean {
  const normalized = model.toLowerCase();
  return (
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('gpt-4.1') ||
    normalized.startsWith('gpt-4o') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.includes('omni')
  );
}

function buildChatCompletionParams(
  params: CompletionParams,
  model: string,
  options: BuildChatParamsOptions = {}
): OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming {
  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      {
        role: 'user',
        content: params.input,
      },
    ],
  };

  const allowCustomTemperature =
    params.temperature !== undefined &&
    !options.stripOptionalParams &&
    !enforcesDefaultTemperature(model);

  if (allowCustomTemperature) {
    payload.temperature = params.temperature;
  }

  if (params.max_tokens !== undefined) {
    if (requiresMaxCompletionTokens(model)) {
      payload.max_completion_tokens = params.max_tokens;
    } else {
      payload.max_tokens = params.max_tokens;
    }
  }

  // Add GPT-5-mini specific parameters if not stripping optional params
  if (!options.stripOptionalParams) {
    if (params.verbosity !== undefined) {
      (payload as any).verbosity = params.verbosity;
    }
    if (params.reasoning_effort !== undefined) {
      (payload as any).reasoning_effort = params.reasoning_effort;
    }
  }

  if (options.stripOptionalParams) {
    OPTIONAL_SAMPLING_KEYS.forEach((key) => {
      if (key in payload) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (payload as Record<string, unknown>)[key];
      }
    });
  }

  return payload;
}

function isParameterCompatibilityError(error: unknown): boolean {
  const err = error as {
    status?: number;
    error?: { type?: string; code?: string; message?: string; param?: string };
    message?: string;
  };

  if (err?.status === 400 && err.error?.type === 'invalid_request_error') {
    const code = err.error.code || '';
    if (code === 'unsupported_parameter' || code === 'unsupported_value') {
      return true;
    }
  }

  const message = err?.message || err?.error?.message || '';
  return /Unsupported (parameter|value)/i.test(message);
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
  const model = (params.model || OPENAI_CONFIG.defaultModel).trim();
  const responsesApi = usesResponsesAPI(model);
  const defaultTemperatureRequired = enforcesDefaultTemperature(model);
  if (params.temperature !== undefined && defaultTemperatureRequired) {
    console.warn(
      `⚠️ [OpenAI Client] Model ${model} enforces default temperature. Ignoring custom value ${params.temperature}.`
    );
  }

  const basePayload = responsesApi
    ? null
    : buildChatCompletionParams(params, model);
  const displayTemperature = (() => {
    if (params.temperature === undefined) {
      return 'default (1.0)';
    }
    return defaultTemperatureRequired
      ? `${params.temperature} (ignored → default 1.0)`
      : params.temperature;
  })();

  const executeChatCompletion = async (
    payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
    return client.chat.completions.create(payload);
  };
  const executeResponsesCompletion = async (): Promise<any> => {
    const responsePayload: Parameters<typeof client.responses.create>[0] = {
      model,
      input: [
        {
          role: 'user',
          content: params.input,
        },
      ],
      max_output_tokens: params.max_tokens ?? 600,
    };

    const allowCustomTemperature =
      params.temperature !== undefined && !defaultTemperatureRequired;

    if (allowCustomTemperature) {
      (responsePayload as any).temperature = params.temperature;
    }

    return client.responses.create(responsePayload);
  };

  const performChatCompletion = async (): Promise<OpenAI.Chat.Completions.ChatCompletion> => {
    try {
      return await executeChatCompletion(basePayload!);
    } catch (error) {
      if (isParameterCompatibilityError(error)) {
        console.warn('⚠️ [OpenAI Client] Retrying without optional sampling parameters...');
        const strippedPayload = buildChatCompletionParams(params, model, {
          stripOptionalParams: true,
        });
        return await executeChatCompletion(strippedPayload);
      }
      throw error;
    }
  };

  try {
    // 📤 記錄請求詳情
    console.log('\n' + '='.repeat(80));
    console.log('🤖 [GPT-5-Mini] 發送請求');
    console.log('='.repeat(80));
    console.log(`📋 模型: ${model}`);
    console.log(`🌡️  溫度: ${displayTemperature}`);
    console.log(`📏 最大 Tokens: ${params.max_tokens ?? 'default'}`);
    console.log(`⏰ 請求時間: ${new Date().toLocaleString('zh-TW')}`);
    console.log('\n📝 輸入 Prompt (前500字):');
    console.log('-'.repeat(80));
    console.log(params.input.substring(0, 500));
    if (params.input.length > 500) {
      console.log(`\n... (還有 ${params.input.length - 500} 個字元，總長度: ${params.input.length})`);
    }
    console.log('-'.repeat(80));
    let content = '';
    let responseModel = model;
    let usage: GPT5MiniResponse['usage'] | undefined;
    const duration = Date.now() - startTime;

    if (responsesApi) {
      const response = await executeResponsesCompletion();
      responseModel = response?.model || model;
      content = extractResponsesContent(response);
      usage = normalizeResponsesUsage(response?.usage);

      if (process.env.DEBUG_OPENAI === 'true') {
        console.log('🔍 [DEBUG] Full Response Structure:', JSON.stringify(response, null, 2));
      }
    } else {
      const response = await performChatCompletion();
      const choice = response.choices[0];

      if (choice?.message?.refusal) {
        console.warn('⚠️ [GPT-5-mini] Model refused to respond:', choice.message.refusal);
        return {
          output_text: "感謝您的作答。請提供更具體的內容，以便獲得詳細的評價。",
          model: response.model,
          usage: response.usage,
        };
      }

      content =
        choice?.message?.content ||
        choice?.text ||
        choice?.message?.text ||
        '';
      usage = response.usage;
      responseModel = response.model;

      if (process.env.DEBUG_OPENAI === 'true') {
        console.log('🔍 [DEBUG] Full Response Structure:', JSON.stringify(response, null, 2));
        console.log('🔍 [DEBUG] Choice Details:', {
          finishReason: choice?.finish_reason,
          hasContent: !!content,
          contentLength: content?.length || 0,
          messageKeys: Object.keys(choice?.message || {}),
        });
      }
    }

    console.log('\n✅ [GPT-5-Mini] 收到回應');
    console.log('='.repeat(80));
    console.log(`⏱️  執行時間: ${duration}ms`);
    console.log(`🎯 實際模型: ${responseModel}`);
    console.log(`⏰ 完成時間: ${new Date().toLocaleString('zh-TW')}`);

    if (usage) {
      console.log('\n📊 Token 使用量:');
      console.log(`   • 輸入 Tokens: ${usage.prompt_tokens}`);
      console.log(`   • 輸出 Tokens: ${usage.completion_tokens}`);
      console.log(`   • 總計 Tokens: ${usage.total_tokens}`);
    }

    console.log('\n💬 GPT-5-Mini 完整回應內容:');
    console.log('-'.repeat(80));
    console.log(content);
    console.log('-'.repeat(80));
    console.log('='.repeat(80) + '\n');

    if (!content && usage?.completion_tokens && usage.completion_tokens > 0) {
      console.warn('⚠️ [GPT-5-mini] Empty content despite', usage.completion_tokens, 'completion tokens used');
    }

    return {
      output_text: content,
      model: responseModel,
      usage,
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

function extractResponsesContent(response: any): string {
  if (!response) {
    return '';
  }

  if (Array.isArray((response as any).output_text) && (response as any).output_text.length > 0) {
    return (response as any).output_text.join('\n');
  }

  const segments = (response as any).output;
  if (!Array.isArray(segments)) {
    return '';
  }

  const texts: string[] = [];
  for (const segment of segments) {
    const contents = segment?.content;
    if (!Array.isArray(contents)) continue;
    for (const chunk of contents) {
      if (typeof chunk?.text === 'string') {
        texts.push(chunk.text);
      } else if (Array.isArray(chunk?.content)) {
        chunk.content.forEach((nested: any) => {
          if (typeof nested?.text === 'string') {
            texts.push(nested.text);
          }
        });
      }
    }
  }

  return texts.join('\n').trim();
}

function normalizeResponsesUsage(usage: any): GPT5MiniResponse['usage'] | undefined {
  if (!usage) return undefined;
  const promptTokens = usage.input_tokens ?? usage.prompt_tokens;
  const completionTokens = usage.output_tokens ?? usage.completion_tokens;
  const totalTokens = usage.total_tokens ?? (promptTokens || 0) + (completionTokens || 0);
  return {
    prompt_tokens: promptTokens ?? 0,
    completion_tokens: completionTokens ?? 0,
    total_tokens: totalTokens ?? 0,
  };
}
