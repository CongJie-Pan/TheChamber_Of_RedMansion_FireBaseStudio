/**
 * @fileOverview Adapter 模組專用類型定義
 *
 * 此檔案定義 Perplexity Stream Adapter 所需的所有類型，
 * 包含訊息格式、回調介面、解析結果等。
 */

/**
 * 訊息角色類型
 * Message role types for chat conversations
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * 聊天訊息結構
 * Chat message structure for API requests
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * 解析後的內容區塊類型
 * Types of parsed content chunks from ThinkTagParser
 */
export type ParsedChunkType =
  | 'thinking_start'
  | 'thinking_content'
  | 'thinking_end'
  | 'content';

/**
 * 解析後的內容區塊
 * Parsed chunk from the think tag parser
 */
export interface ParsedChunk {
  type: ParsedChunkType;
  content?: string;
}

/**
 * 串流回調介面
 * Callbacks for streaming chat responses
 *
 * 這是 Side Project A 的核心設計模式，
 * 透過事件驅動的方式處理串流內容。
 */
export interface StreamCallbacks {
  /** 當 <think> 標籤開始時觸發 */
  onThinkingStart: () => void;

  /** 當收到思考內容時觸發 */
  onThinkingContent: (content: string) => void;

  /** 當 </think> 標籤結束時觸發 */
  onThinkingEnd: () => void;

  /** 當收到回答內容時觸發（在 </think> 之後） */
  onContent: (content: string) => void;

  /** 當收到引用來源時觸發 */
  onCitations: (citations: string[]) => void;

  /** 當串流完成時觸發 */
  onDone: () => void;

  /** 當發生錯誤時觸發 */
  onError: (error: Error) => void;
}

/**
 * Perplexity API 串流區塊
 * Raw streaming chunk from Perplexity API
 */
export interface PerplexityRawStreamChunk {
  id: string;
  model?: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason: 'stop' | 'length' | null;
  }>;
  citations?: string[];
  search_results?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 串流選項
 * Options for creating chat stream
 */
export interface ChatStreamOptions {
  /** 使用的模型名稱 */
  model?: string;

  /** 最大 token 數 */
  maxTokens?: number;

  /** 溫度參數 (0-1) */
  temperature?: number;

  /** 取消信號 */
  abortSignal?: AbortSignal;
}

/**
 * Adapter 配置選項
 * Configuration options for the adapter
 */
export interface AdapterConfig {
  /** API 金鑰（可選，預設從環境變數取得） */
  apiKey?: string;

  /** 是否啟用除錯日誌 */
  debug?: boolean;
}
