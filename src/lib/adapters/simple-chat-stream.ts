/**
 * @fileOverview SimpleChatStream - 簡化版串流處理函數
 *
 * 從 Side Project A 移植的核心串流處理邏輯，使用 native fetch
 * 而非 axios，提供更好的 SSE (Server-Sent Events) 支援。
 *
 * 設計特點：
 * - Native Fetch：更好的串流支援，無需額外轉換
 * - Callbacks 模式：清晰的事件驅動架構
 * - AbortController：支援請求取消
 * - 資源清理：確保 reader 和 parser 正確釋放
 *
 * @example
 * ```typescript
 * import { createSimpleChatStream } from '@/lib/adapters/simple-chat-stream';
 *
 * const abortController = new AbortController();
 *
 * await createSimpleChatStream(
 *   [{ role: 'user', content: '你好' }],
 *   {
 *     onThinkingStart: () => console.log('開始思考'),
 *     onThinkingContent: (c) => console.log('思考:', c),
 *     onThinkingEnd: () => console.log('思考結束'),
 *     onContent: (c) => console.log('回答:', c),
 *     onCitations: (urls) => console.log('引用:', urls),
 *     onDone: () => console.log('完成'),
 *     onError: (e) => console.error('錯誤:', e),
 *   },
 *   { abortSignal: abortController.signal }
 * );
 * ```
 */

import { SimpleThinkParser } from './simple-think-parser';
import type {
  ChatMessage,
  StreamCallbacks,
  ChatStreamOptions,
  PerplexityRawStreamChunk,
} from './types';
import {
  PERPLEXITY_CONFIG,
  getPerplexityApiKey,
} from '@/ai/perplexity-config';
import { PERPLEXITY_FLAGS } from '@/lib/perplexity-feature-flags';

/**
 * 串流錯誤類別
 *
 * 封裝 Perplexity API 錯誤，包含 HTTP 狀態碼和回應內容
 */
export class SimpleChatStreamError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = 'SimpleChatStreamError';

    // 維護正確的 stack trace（V8 環境）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SimpleChatStreamError);
    }
  }
}

/**
 * 檢查是否為取消錯誤
 *
 * @param error - 要檢查的錯誤
 * @returns 是否為使用者主動取消
 */
function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message === 'Request aborted';
  }
  return false;
}

/**
 * 建立串流聊天請求
 *
 * 使用 native fetch 向 Perplexity API 發送串流請求，
 * 並透過 callbacks 回傳解析後的內容。
 *
 * @param messages - 聊天訊息陣列
 * @param callbacks - 串流事件回調
 * @param options - 串流選項
 */
export async function createSimpleChatStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: ChatStreamOptions
): Promise<void> {
  const parser = new SimpleThinkParser();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  /**
   * 清理資源
   * 在完成、錯誤或取消時釋放 reader 和重置 parser
   */
  const cleanup = async (): Promise<void> => {
    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // 忽略清理時的錯誤
      }
      reader = null;
    }
    parser.reset();
  };

  /**
   * 處理取消信號
   */
  const handleAbort = (): void => {
    cleanup();
  };

  // 設置取消監聽
  if (options?.abortSignal) {
    if (options.abortSignal.aborted) {
      // 已經取消，直接返回
      return;
    }
    options.abortSignal.addEventListener('abort', handleAbort);
  }

  try {
    // 取得 API 金鑰
    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      throw new SimpleChatStreamError(
        'Perplexity API key is not configured',
        401
      );
    }

    // 建構請求 URL
    const url = `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`;

    // 建構請求內容
    const requestBody = {
      model: options?.model || 'sonar-reasoning',
      messages,
      stream: true,
      max_tokens: options?.maxTokens || PERPLEXITY_CONFIG.DEFAULT_MAX_TOKENS,
      temperature: options?.temperature ?? PERPLEXITY_CONFIG.DEFAULT_TEMPERATURE,
    };

    if (PERPLEXITY_FLAGS.debugAdapter) {
      console.log('[SimpleChatStream] Starting request:', {
        url,
        model: requestBody.model,
        messageCount: messages.length,
      });
    }

    // 使用 native fetch 發送請求
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      signal: options?.abortSignal,
    });

    // 處理 HTTP 錯誤
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      let errorBody: unknown;

      try {
        errorBody = await response.json();
        const apiError = errorBody as { error?: { message?: string } };
        if (apiError?.error?.message) {
          errorMessage = apiError.error.message;
        }
      } catch {
        // 無法解析 JSON，使用預設錯誤訊息
      }

      throw new SimpleChatStreamError(errorMessage, response.status, errorBody);
    }

    // 取得 response body reader
    const bodyReader = response.body?.getReader();
    if (!bodyReader) {
      throw new SimpleChatStreamError('No response body available', 500);
    }
    reader = bodyReader;

    const decoder = new TextDecoder();
    let pendingCitations: string[] = [];
    let buffer = ''; // 用於處理跨 chunk 的 SSE 資料

    if (PERPLEXITY_FLAGS.debugAdapter) {
      console.log('[SimpleChatStream] Stream started, reading chunks...');
    }

    // 讀取並處理串流
    while (true) {
      // 檢查是否已取消
      if (options?.abortSignal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        if (PERPLEXITY_FLAGS.debugAdapter) {
          console.log('[SimpleChatStream] Stream reading complete');
        }
        break;
      }

      // 解碼並加入 buffer
      buffer += decoder.decode(value, { stream: true });

      // 按行分割處理
      const lines = buffer.split('\n');
      // 最後一行可能不完整，保留在 buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 跳過空行
        if (!trimmedLine) continue;

        // 檢查 SSE 資料前綴
        if (!trimmedLine.startsWith('data: ')) continue;

        const data = trimmedLine.slice(6); // 移除 'data: ' 前綴

        // 檢查串流結束信號
        if (data === '[DONE]') {
          if (PERPLEXITY_FLAGS.debugAdapter) {
            console.log('[SimpleChatStream] Received [DONE] signal');
          }

          // 發送累積的引用
          if (pendingCitations.length > 0) {
            callbacks.onCitations(pendingCitations);
          }

          callbacks.onDone();
          return;
        }

        // 解析 JSON chunk
        try {
          const chunk: PerplexityRawStreamChunk = JSON.parse(data);
          const content = chunk.choices?.[0]?.delta?.content || '';

          // 收集引用
          if (chunk.citations && chunk.citations.length > 0) {
            pendingCitations = chunk.citations;
          }

          // 解析內容中的 <think> 標籤
          if (content) {
            const parsedChunks = parser.parse(content);

            for (const parsed of parsedChunks) {
              switch (parsed.type) {
                case 'thinking_start':
                  callbacks.onThinkingStart();
                  break;

                case 'thinking_content':
                  if (parsed.content) {
                    callbacks.onThinkingContent(parsed.content);
                  }
                  break;

                case 'thinking_end':
                  callbacks.onThinkingEnd();
                  break;

                case 'content':
                  if (parsed.content) {
                    callbacks.onContent(parsed.content);
                  }
                  break;
              }
            }
          }
        } catch (parseError) {
          // JSON 解析錯誤，可能是 SSE 資料被分割
          // 記錄但繼續處理
          if (PERPLEXITY_FLAGS.debugAdapter && data.trim().length > 0) {
            console.warn('[SimpleChatStream] Failed to parse chunk:', {
              data: data.slice(0, 100),
              error: parseError instanceof Error ? parseError.message : 'Unknown',
            });
          }
        }
      }
    }

    // 串流結束但沒有收到 [DONE]（正常結束）
    if (pendingCitations.length > 0) {
      callbacks.onCitations(pendingCitations);
    }
    callbacks.onDone();

  } catch (error) {
    // 不對使用者主動取消觸發 onError
    if (isAbortError(error)) {
      if (PERPLEXITY_FLAGS.debugAdapter) {
        console.log('[SimpleChatStream] Request aborted by user');
      }
      return;
    }

    // 轉換為適當的錯誤類型
    let normalizedError: Error;

    if (error instanceof SimpleChatStreamError) {
      normalizedError = error;
    } else if (error instanceof Error) {
      // 檢查是否為 fetch abort 錯誤
      if (error.name === 'AbortError') {
        if (PERPLEXITY_FLAGS.debugAdapter) {
          console.log('[SimpleChatStream] Fetch aborted');
        }
        return;
      }
      normalizedError = error;
    } else {
      normalizedError = new Error(String(error));
    }

    if (PERPLEXITY_FLAGS.debugAdapter) {
      console.error('[SimpleChatStream] Error:', normalizedError.message);
    }

    callbacks.onError(normalizedError);

  } finally {
    // 清理資源
    await cleanup();

    // 移除取消監聽
    if (options?.abortSignal) {
      options.abortSignal.removeEventListener('abort', handleAbort);
    }
  }
}

// 匯出類型
export type { ChatMessage, StreamCallbacks, ChatStreamOptions };
