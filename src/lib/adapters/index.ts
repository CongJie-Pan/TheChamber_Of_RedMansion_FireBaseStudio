/**
 * @fileOverview Perplexity Stream Adapter 模組匯出
 *
 * 此模組提供簡化版的 Perplexity API 串流處理，
 * 從 Side Project A 移植並轉接到主專案的介面。
 *
 * @example
 * ```typescript
 * import { PerplexityStreamAdapter } from '@/lib/adapters';
 *
 * const adapter = new PerplexityStreamAdapter();
 * for await (const chunk of adapter.streamingQA(input)) {
 *   console.log(chunk.content);
 * }
 * ```
 */

// 類型匯出
export type {
  MessageRole,
  ChatMessage,
  ParsedChunkType,
  ParsedChunk,
  StreamCallbacks,
  PerplexityRawStreamChunk,
  ChatStreamOptions,
  AdapterConfig,
} from './types';

// 核心模組匯出
export { SimpleThinkParser } from './simple-think-parser';
export { createSimpleChatStream, SimpleChatStreamError } from './simple-chat-stream';

// Adapter 匯出
export { PerplexityStreamAdapter } from './perplexity-stream-adapter';
