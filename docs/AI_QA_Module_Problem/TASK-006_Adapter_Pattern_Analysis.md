# TASK-006：AI 問答功能修復 - 轉接器模式分析報告

> **文件建立日期**：2025-12-08
> **目標**：使用 Adapter Pattern 將 Side Project A 的乾淨解法整合回主專案

---

## 目錄

1. [問題背景](#問題背景)
2. [步驟 1：Side Project A 程式碼分析](#步驟-1side-project-a-程式碼分析)
3. [步驟 2：主專案相關模組程式碼分析](#步驟-2主專案相關模組程式碼分析)
4. [步驟 3：轉接層（Adapter）方案設計](#步驟-3轉接層adapter方案設計)
5. [步驟 4：具體的程式碼與修改建議](#步驟-4具體的程式碼與修改建議)
6. [步驟 5：測試與風險控管建議](#步驟-5測試與風險控管建議)
7. [附錄：程式碼行數對比](#附錄程式碼行數對比)

---

## 問題背景

### 症狀描述
- 輸入問題後返回「發生未知錯誤，請稍後重試」
- 介面一直顯示「AI正在深度思考中」狀態不會結束
- 測試輸入 "你好" 時無法獲得正常回應

### 根本原因（疑似）
主專案的 `perplexity-client.ts` 超過 **1,315 行**，包含大量 debug 日誌和複雜的 HYPOTHESIS A/B/C 修復邏輯，導致：
1. 串流處理邏輯過於複雜
2. `</think>` 標籤偵測可能在特定情況下失敗
3. 狀態轉換邏輯難以維護和除錯

### 解決策略
使用已驗證可運作的 Side Project A 的乾淨邏輯，透過 **Adapter Pattern** 漸進式整合回主專案。

---

## 步驟 1：Side Project A 程式碼分析

### 1.1 功能目標

Side Project A 的 Perplexity 模組目標：
- 提供乾淨的 Perplexity API 串流聊天功能
- 正確處理 `<think>...</think>` 標籤（思考過程與回答分離）
- 支援請求取消（AbortController）
- 提供完善的錯誤處理與回報機制

### 1.2 主要資料流

```
┌─────────────────────────────────────────────────────────────────┐
│                         資料流圖                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [前端 React Component]                                          │
│         │                                                       │
│         ▼                                                       │
│  createChatStream(messages, callbacks, abortSignal)             │
│         │                                                       │
│         ▼                                                       │
│  [POST /api/chat]  ─────────────────────────────────────────┐   │
│         │                                                   │   │
│         ▼                                                   │   │
│  Rate Limiting → Validation → Perplexity API                │   │
│                                     │                       │   │
│                                     ▼                       │   │
│                              SSE Stream (text/event-stream) │   │
│                                     │                       │   │
│                                     ▼                       │   │
│  [ThinkTagParser.parse(chunk)]  ←────────────────────────────   │
│         │                                                       │
│         ▼                                                       │
│  ParsedChunk[] → callbacks                                      │
│         │                                                       │
│         ├─→ onThinkingStart()                                   │
│         ├─→ onThinkingContent(content)                          │
│         ├─→ onThinkingEnd()                                     │
│         ├─→ onContent(content)                                  │
│         ├─→ onCitations(citations[])                            │
│         ├─→ onDone()                                            │
│         └─→ onError(error)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Input（前端傳入參數）

```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// createChatStream 函數參數
messages: ChatMessage[]
callbacks: StreamCallbacks
abortSignal?: AbortSignal
```

#### Output（後端回傳資料結構）

```typescript
// SSE 串流格式
data: {"id":"...","choices":[{"delta":{"content":"..."}}],"citations":["..."]}
data: [DONE]

// API 錯誤回應格式
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    status: number;
    retryAfter?: number;
  };
}
```

#### 串流過程中的 Chunk 格式

```typescript
interface PerplexityStreamChunk {
  id: string;
  model?: string;
  choices: StreamChoice[];
  citations?: string[];
  search_results?: SearchResult[];
  usage?: UsageInfo;
}

interface StreamChoice {
  index: number;
  delta: { role?: 'assistant'; content?: string };
  finish_reason: 'stop' | 'length' | null;
}
```

### 1.3 重要物件或資料結構

#### 類別定義（class）

| 類別名稱 | 檔案位置 | 行數 | 職責 |
|---------|---------|------|------|
| `ThinkTagParser` | `parser.ts` | 197 | 解析 `<think>` 標籤，維護 buffer 狀態 |
| `PerplexityAPIError` | `error.ts` | 25 | API 錯誤封裝，包含 statusCode |
| `StreamParseError` | `error.ts` | 15 | 串流解析錯誤，包含 rawData |
| `ValidationError` | `error.ts` | 12 | 輸入驗證錯誤 |

#### 介面定義（interface/type）

| 介面名稱 | 用途 |
|---------|------|
| `ChatMessage` | 聊天訊息結構（role + content） |
| `StreamCallbacks` | 串流事件回調集合（7 個回調） |
| `ParsedChunk` | 解析後的內容區塊 |
| `PerplexityStreamChunk` | API 原始串流區塊 |

#### StreamCallbacks 介面（核心設計）

```typescript
interface StreamCallbacks {
  onThinkingStart: () => void;           // <think> 開始
  onThinkingContent: (content: string) => void;  // 思考內容
  onThinkingEnd: () => void;             // </think> 結束
  onContent: (content: string) => void;  // 回答內容
  onCitations: (citations: string[]) => void;    // 引用來源
  onDone: () => void;                    // 串流完成
  onError: (error: Error) => void;       // 錯誤發生
}
```

### 1.4 關鍵邏輯步驟

#### SSE 連線建立與錯誤處理

```typescript
// client.ts:86-116 - 使用 native fetch
const response = await fetch(API_CONFIG.chatEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages }),
  signal: abortSignal, // 支援取消
});

// HTTP 錯誤處理
if (!response.ok) {
  throw new PerplexityAPIError(errorMessage, response.status, errorBody);
}

// 取得 ReadableStream reader
const bodyReader = response.body?.getReader();
```

#### `<think>` 標籤解析流程

```typescript
// parser.ts - ThinkTagParser 核心邏輯
class ThinkTagParser {
  private isInThinkTag = false;    // 狀態追蹤
  private buffer = '';              // 內容緩衝

  parse(text: string): ParsedChunk[] {
    this.buffer += text;

    // 1. 尋找 <think> 開始標籤
    const thinkStartIndex = this.buffer.indexOf('<think>');

    // 2. 若在 <think> 內，尋找 </think> 結束標籤
    const thinkEndIndex = this.buffer.indexOf('</think>');

    // 3. 處理跨 chunk 的不完整標籤（buffer 機制）
    const partialTagIndex = this.buffer.lastIndexOf('<');

    // 4. 回傳結構化的 ParsedChunk[]
  }
}
```

#### 串流終止與資源清理

```typescript
// client.ts:58-68 - cleanup 函數
const cleanup = async (): Promise<void> => {
  if (reader) {
    try {
      await reader.cancel();
    } catch {
      // Ignore errors during cleanup
    }
    reader = null;
  }
  parser.reset();
};

// client.ts:242-250 - finally 區塊確保清理
finally {
  await cleanup();
  if (abortSignal) {
    abortSignal.removeEventListener('abort', handleAbort);
  }
}
```

### 1.5 Side Project A 設計優點

| 優點 | 說明 |
|------|------|
| **Native Fetch** | 比 axios 更好的串流支援，無需額外轉換 |
| **Callbacks 模式** | 清晰的事件驅動架構，易於測試和除錯 |
| **Buffer 管理** | 正確處理跨 chunk 的不完整標籤 |
| **資源清理** | 完善的 cleanup 機制，防止記憶體洩漏 |
| **取消支援** | 原生 AbortController 整合 |
| **精簡程式碼** | 核心邏輯約 600 行，易於維護 |

---

## 步驟 2：主專案相關模組程式碼分析

### 2.1 對外公開的介面

#### API 端點路徑與 HTTP method

| 端點 | Method | 用途 |
|------|--------|------|
| `/api/perplexity-qa-stream` | POST | 串流問答主端點 |
| `/api/perplexity-qa-stream` | GET | 健康檢查與 API 文件 |

#### Request 參數格式

```typescript
// POST /api/perplexity-qa-stream
interface RequestBody {
  userQuestion: string;              // 必填：使用者問題
  selectedTextInfo?: object;         // 選填：選取的文字資訊
  chapterContext?: string;           // 選填：章節上下文
  currentChapter?: string;           // 選填：當前章節
  modelKey?: PerplexityModelKey;     // 選填：模型選擇
  reasoningEffort?: ReasoningEffort; // 選填：推理強度
  questionContext?: QuestionContext; // 選填：問題情境
  showThinkingProcess?: boolean;     // 選填：顯示思考過程
  temperature?: number;              // 選填：溫度參數
  maxTokens?: number;                // 選填：最大 token 數
}
```

#### Response 格式（SSE）

```typescript
// 串流 chunk 格式
interface PerplexityStreamingChunk {
  content: string;                   // 增量內容
  fullContent: string;               // 累積完整內容
  thinkingContent?: string;          // 思考過程內容
  contentDerivedFromThinking?: boolean; // 是否從思考內容衍生
  timestamp: string;
  citations: PerplexityCitation[];
  searchQueries: string[];
  metadata: Partial<PerplexityGroundingMetadata>;
  responseTime: number;
  isComplete: boolean;
  chunkIndex: number;
  hasThinkingProcess?: boolean;
  error?: string;
}
```

### 2.2 內部相依的其他服務或模組

#### 被呼叫的元件/頁面

```
src/app/(main)/read-book/page.tsx
    └── 使用 Perplexity QA 進行閱讀問答

src/components/ui/AIMessageBubble.tsx
    └── 顯示 AI 回答的 UI 元件

src/components/ui/ConversationFlow.tsx
    └── 對話流程管理元件
```

#### 依賴的工具函數或配置

```typescript
// 主要相依模組
src/lib/perplexity-client.ts          // Perplexity API 客戶端
src/lib/streaming/perplexity-stream-processor.ts  // 串流處理器
src/lib/perplexity-thinking-utils.ts  // 思考內容工具
src/lib/perplexity-error-handler.ts   // 錯誤處理
src/lib/citation-processor.ts         // 引用處理
src/lib/terminal-logger.ts            // 終端日誌

src/ai/flows/perplexity-red-chamber-qa.ts  // 紅樓夢專用流程
src/ai/perplexity-config.ts           // 配置常數

src/types/perplexity-qa.ts            // 類型定義
```

### 2.3 可能產生耦合或風險較高的點

#### 狀態管理的耦合

| 耦合點 | 風險程度 | 說明 |
|--------|---------|------|
| `PerplexityStreamProcessor.state` | **高** | inside/outside/incomplete_open 狀態機複雜 |
| `PerplexityStreamProcessor.tagDepth` | **高** | 巢狀標籤深度追蹤，容易出錯 |
| `accumulatedThinking[]` | **中** | 多處累積思考內容，可能不同步 |
| `lastEmittedThinkingLength` | **中** | Delta 追蹤邏輯複雜 |

#### 類型定義的相依

```typescript
// 主專案使用的擴展類型
PerplexityModelKey        // 'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro'
ReasoningEffort           // 'low' | 'medium' | 'high'
QuestionContext           // 'character' | 'plot' | 'theme' | 'general'
PerplexityQAInput         // 包含紅樓夢專用欄位
PerplexityStreamingChunk  // 比 Side Project 更複雜
```

#### 錯誤處理的差異

| 項目 | Side Project A | 主專案 |
|------|---------------|--------|
| 錯誤類別 | `PerplexityAPIError` | `PerplexityQAError` |
| 錯誤分類 | 簡單（3 種） | 複雜（多層分類） |
| 使用者訊息 | 英文 | 繁體中文 |
| 重試邏輯 | Rate limit headers | `shouldAttemptRetry()` |

### 2.4 主專案的複雜性問題

#### PerplexityStreamProcessor（842 行）的問題

```typescript
// 存在多個 HYPOTHESIS 修復邏輯
// HYPOTHESIS A: Sliding Window 偵測 </think>（約 100 行）
// HYPOTHESIS B: Delta Thinking Emission（約 80 行）
// HYPOTHESIS C: Remaining Content Calculation（約 60 行）

// 大量除錯日誌（估計佔 20-30% 程式碼）
console.log('[StreamProcessor] ...');
console.log('╔═══════════════════════════════════════════════════╗');
console.log('║ 🔧 [FALLBACK] ...');
```

#### PerplexityClient（1,315 行）的問題

```typescript
// streamingCompletionRequest 函數過長（約 650 行）
// 包含：
// - deriveAnswerFromThinking() 內嵌函數
// - 多重 fallback 邏輯
// - 超過 100 處 console.log 呼叫
// - MAX_READ_ITERATIONS = 10000 防護
```

---

## 步驟 3：轉接層（Adapter）方案設計

### 3.1 Adapter 介面定義

#### 對主專案暴露的方法與參數

```typescript
/**
 * PerplexityStreamAdapter
 *
 * 將 Side Project A 的乾淨串流邏輯轉接到主專案的介面
 */
export interface IPerplexityStreamAdapter {
  /**
   * 串流問答（對應主專案現有介面）
   */
  streamingQA(
    input: PerplexityQAInput,
  ): AsyncGenerator<PerplexityStreamingChunk>;

  /**
   * 非串流問答（保留現有功能）
   */
  completionQA(input: PerplexityQAInput): Promise<PerplexityQAResponse>;

  /**
   * 測試連線
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * 檢查配置狀態
   */
  isConfigured(): boolean;
}
```

#### 回傳值格式對應

```typescript
// Side Project A 的 StreamCallbacks
//   ↓ 轉換為 ↓
// 主專案的 PerplexityStreamingChunk

function convertToStreamingChunk(
  sideProjectState: {
    thinkingContent: string;
    answerContent: string;
    citations: string[];
    isComplete: boolean;
  },
  chunkIndex: number,
  startTime: number,
): PerplexityStreamingChunk {
  return {
    content: sideProjectState.answerContent,      // 增量
    fullContent: sideProjectState.answerContent,  // 累積
    thinkingContent: sideProjectState.thinkingContent,
    contentDerivedFromThinking: false,
    timestamp: new Date().toISOString(),
    citations: convertCitations(sideProjectState.citations),
    searchQueries: [],
    metadata: {
      searchQueries: [],
      webSources: [],
      groundingSuccessful: sideProjectState.citations.length > 0,
    },
    responseTime: (Date.now() - startTime) / 1000,
    isComplete: sideProjectState.isComplete,
    chunkIndex,
    hasThinkingProcess: sideProjectState.thinkingContent.length > 0,
  };
}
```

### 3.2 內部實作

#### 包裝 Side Project A 的邏輯

```typescript
/**
 * 核心轉接實作
 *
 * 使用 Side Project A 的：
 * - createChatStream() 函數
 * - ThinkTagParser 類別
 *
 * 保留主專案的：
 * - buildPrompt() 紅樓夢專用 prompt
 * - 類型定義與配置
 */
export class PerplexityStreamAdapter implements IPerplexityStreamAdapter {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || getPerplexityApiKey() || '';
  }

  async* streamingQA(
    input: PerplexityQAInput,
  ): AsyncGenerator<PerplexityStreamingChunk> {
    // 1. 使用主專案的 buildPrompt 建構紅樓夢專用 prompt
    const prompt = this.buildRedChamberPrompt(input);

    // 2. 轉換為 Side Project A 的 ChatMessage 格式
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt },
    ];

    // 3. 建立狀態追蹤
    const state = {
      thinkingContent: '',
      answerContent: '',
      citations: [] as string[],
      isComplete: false,
    };

    // 4. 使用 Promise + callbacks 轉換為 AsyncGenerator
    // ... (詳見 4.3 程式碼骨架)
  }
}
```

#### 資料格式轉換

| 來源（Side Project A） | 目標（主專案） | 轉換邏輯 |
|----------------------|--------------|---------|
| `ChatMessage` | `PerplexityQAInput.userQuestion` | 建構 prompt 後包裝 |
| `string[]` citations | `PerplexityCitation[]` | 加入 title/domain 等 |
| `ParsedChunk` | 累積到 state | 根據 type 分類累積 |
| `StreamCallbacks` events | `yield PerplexityStreamingChunk` | 事件驅動轉 generator |

### 3.3 新舊邏輯並存策略

#### Feature Flag 設計

```typescript
// .env.local
PERPLEXITY_USE_NEW_ADAPTER=true  // 啟用新 Adapter
PERPLEXITY_DEBUG_ADAPTER=true    // 啟用 Adapter 除錯日誌

// src/lib/perplexity-feature-flags.ts
export const PERPLEXITY_FLAGS = {
  useNewAdapter: process.env.PERPLEXITY_USE_NEW_ADAPTER === 'true',
  debugAdapter: process.env.PERPLEXITY_DEBUG_ADAPTER === 'true',
} as const;
```

#### 漸進式 Rollout 流程

```
Phase 1: 開發與測試（1-2 天）
├── 建立 Adapter 類別
├── 撰寫單元測試
└── 本地驗證

Phase 2: 並存運行（2-3 天）
├── Feature Flag 控制切換
├── 新舊邏輯 A/B 比較
└── 日誌監控錯誤率

Phase 3: 漸進切換（1-2 天）
├── 50% 流量使用新 Adapter
├── 監控效能與錯誤
└── 確認穩定後 100% 切換

Phase 4: 清理舊程式碼
├── 移除 Feature Flag
├── 刪除舊的複雜邏輯
└── 更新文件
```

#### 切換邏輯實作

```typescript
// src/ai/flows/perplexity-red-chamber-qa.ts

import { PERPLEXITY_FLAGS } from '@/lib/perplexity-feature-flags';
import { PerplexityStreamAdapter } from '@/lib/adapters/perplexity-stream-adapter';
import { PerplexityClient } from '@/lib/perplexity-client'; // 舊實作

export async function* perplexityRedChamberQAStreaming(
  input: PerplexityQAInput,
): AsyncGenerator<PerplexityStreamingChunk> {
  if (PERPLEXITY_FLAGS.useNewAdapter) {
    // 使用新的 Adapter（Side Project A 邏輯）
    const adapter = new PerplexityStreamAdapter();
    yield* adapter.streamingQA(input);
  } else {
    // 使用舊的 PerplexityClient
    const client = new PerplexityClient();
    yield* client.streamingCompletionRequest(input);
  }
}
```

---

## 步驟 4：具體的程式碼與修改建議

### 4.1 新增檔案清單

| 檔名 | 職責說明 |
|------|---------|
| `src/lib/adapters/perplexity-stream-adapter.ts` | 核心 Adapter 實作，包裝 Side Project A 邏輯 |
| `src/lib/adapters/simple-think-parser.ts` | 簡化版 ThinkTagParser（移植自 Side Project A） |
| `src/lib/adapters/simple-chat-stream.ts` | 簡化版串流處理（移植自 Side Project A） |
| `src/lib/adapters/types.ts` | Adapter 專用類型定義 |
| `src/lib/perplexity-feature-flags.ts` | Feature Flag 配置 |
| `tests/lib/adapters/perplexity-stream-adapter.test.ts` | Adapter 單元測試 |

### 4.2 修改檔案清單

| 檔名 | 要改什麼 | 為何要改 |
|------|---------|---------|
| `src/ai/flows/perplexity-red-chamber-qa.ts` | 加入 Feature Flag 切換邏輯 | 支援新舊 Adapter 並存 |
| `src/app/api/perplexity-qa-stream/route.ts` | 無需修改 | Adapter 對外介面相容 |
| `.env.local` | 加入 `PERPLEXITY_USE_NEW_ADAPTER` | Feature Flag 配置 |
| `src/lib/perplexity-client.ts` | 標記為 deprecated | 漸進式淘汰 |

### 4.3 程式碼骨架（TypeScript）

#### `src/lib/adapters/simple-think-parser.ts`

```typescript
/**
 * SimpleThinkParser
 *
 * 從 Side Project A 移植的簡化版 ThinkTagParser
 * 職責：解析串流內容中的 <think>...</think> 標籤
 */

export type ParsedChunkType = 'thinking_start' | 'thinking_content' | 'thinking_end' | 'content';

export interface ParsedChunk {
  type: ParsedChunkType;
  content?: string;
}

export class SimpleThinkParser {
  private static readonly THINK_OPEN = '<think>';
  private static readonly THINK_CLOSE = '</think>';

  private isInThinkTag = false;
  private buffer = '';

  /**
   * 解析輸入文字，回傳解析後的區塊陣列
   */
  parse(text: string): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    this.buffer += text;

    while (this.buffer.length > 0) {
      if (!this.isInThinkTag) {
        // 尋找 <think> 開始標籤
        const openIndex = this.buffer.indexOf(SimpleThinkParser.THINK_OPEN);

        if (openIndex === -1) {
          // 檢查是否有不完整的標籤在結尾
          const partialIndex = this.findPartialTag(this.buffer);
          if (partialIndex !== -1) {
            const content = this.buffer.slice(0, partialIndex);
            if (content) chunks.push({ type: 'content', content });
            this.buffer = this.buffer.slice(partialIndex);
            break;
          }

          // 沒有標籤，全部輸出為內容
          if (this.buffer) chunks.push({ type: 'content', content: this.buffer });
          this.buffer = '';
          break;
        }

        // 找到 <think>，輸出前面的內容
        if (openIndex > 0) {
          chunks.push({ type: 'content', content: this.buffer.slice(0, openIndex) });
        }
        chunks.push({ type: 'thinking_start' });
        this.isInThinkTag = true;
        this.buffer = this.buffer.slice(openIndex + 7); // '<think>'.length = 7

      } else {
        // 尋找 </think> 結束標籤
        const closeIndex = this.buffer.indexOf(SimpleThinkParser.THINK_CLOSE);

        if (closeIndex === -1) {
          // 檢查是否有不完整的結束標籤
          const partialIndex = this.findPartialCloseTag(this.buffer);
          if (partialIndex !== -1) {
            const content = this.buffer.slice(0, partialIndex);
            if (content) chunks.push({ type: 'thinking_content', content });
            this.buffer = this.buffer.slice(partialIndex);
            break;
          }

          // 沒有結束標籤，全部輸出為思考內容
          if (this.buffer) chunks.push({ type: 'thinking_content', content: this.buffer });
          this.buffer = '';
          break;
        }

        // 找到 </think>，輸出思考內容
        if (closeIndex > 0) {
          chunks.push({ type: 'thinking_content', content: this.buffer.slice(0, closeIndex) });
        }
        chunks.push({ type: 'thinking_end' });
        this.isInThinkTag = false;
        this.buffer = this.buffer.slice(closeIndex + 8); // '</think>'.length = 8
      }
    }

    return chunks;
  }

  /**
   * 尋找可能不完整的開始標籤
   */
  private findPartialTag(text: string): number {
    const partials = ['<think', '<thin', '<thi', '<th', '<t', '<'];
    for (const p of partials) {
      if (text.endsWith(p)) return text.length - p.length;
    }
    return -1;
  }

  /**
   * 尋找可能不完整的結束標籤
   */
  private findPartialCloseTag(text: string): number {
    const partials = ['</think', '</thin', '</thi', '</th', '</t', '</'];
    for (const p of partials) {
      if (text.endsWith(p)) return text.length - p.length;
    }
    return -1;
  }

  /**
   * 重置解析器狀態
   */
  reset(): void {
    this.isInThinkTag = false;
    this.buffer = '';
  }

  get isThinking(): boolean {
    return this.isInThinkTag;
  }
}
```

#### `src/lib/adapters/simple-chat-stream.ts`

```typescript
/**
 * SimpleChatStream
 *
 * 從 Side Project A 移植的簡化版串流處理
 * 使用 native fetch 而非 axios
 */

import { SimpleThinkParser, ParsedChunk } from './simple-think-parser';
import { PERPLEXITY_CONFIG, getPerplexityApiKey } from '@/ai/perplexity-config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onThinkingStart: () => void;
  onThinkingContent: (content: string) => void;
  onThinkingEnd: () => void;
  onContent: (content: string) => void;
  onCitations: (citations: string[]) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export class SimpleChatStreamError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: unknown,
  ) {
    super(message);
    this.name = 'SimpleChatStreamError';
  }
}

/**
 * 建立串流聊天請求
 */
export async function createSimpleChatStream(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    abortSignal?: AbortSignal;
  },
): Promise<void> {
  const parser = new SimpleThinkParser();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  const cleanup = async () => {
    if (reader) {
      try { await reader.cancel(); } catch { /* ignore */ }
      reader = null;
    }
    parser.reset();
  };

  const handleAbort = () => cleanup();

  if (options?.abortSignal) {
    if (options.abortSignal.aborted) return;
    options.abortSignal.addEventListener('abort', handleAbort);
  }

  try {
    const apiKey = getPerplexityApiKey();
    if (!apiKey) {
      throw new SimpleChatStreamError('API key not configured', 401);
    }

    // 使用 native fetch
    const response = await fetch(
      `${PERPLEXITY_CONFIG.BASE_URL}${PERPLEXITY_CONFIG.CHAT_COMPLETIONS_ENDPOINT}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || 'sonar-reasoning',
          messages,
          stream: true,
          max_tokens: options?.maxTokens || 2000,
          temperature: options?.temperature || 0.2,
        }),
        signal: options?.abortSignal,
      },
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody?.error?.message || errorMessage;
      } catch { /* ignore */ }
      throw new SimpleChatStreamError(errorMessage, response.status);
    }

    const bodyReader = response.body?.getReader();
    if (!bodyReader) throw new Error('No response body');
    reader = bodyReader;

    const decoder = new TextDecoder();
    let pendingCitations: string[] = [];
    let buffer = '';

    while (true) {
      if (options?.abortSignal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          if (pendingCitations.length > 0) callbacks.onCitations(pendingCitations);
          callbacks.onDone();
          return;
        }

        try {
          const chunk = JSON.parse(data);
          const content = chunk.choices?.[0]?.delta?.content || '';

          if (chunk.citations?.length > 0) {
            pendingCitations = chunk.citations;
          }

          if (content) {
            const parsed = parser.parse(content);
            for (const p of parsed) {
              switch (p.type) {
                case 'thinking_start': callbacks.onThinkingStart(); break;
                case 'thinking_content': if (p.content) callbacks.onThinkingContent(p.content); break;
                case 'thinking_end': callbacks.onThinkingEnd(); break;
                case 'content': if (p.content) callbacks.onContent(p.content); break;
              }
            }
          }
        } catch { /* skip parse errors */ }
      }
    }

    if (pendingCitations.length > 0) callbacks.onCitations(pendingCitations);
    callbacks.onDone();

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    await cleanup();
    if (options?.abortSignal) {
      options.abortSignal.removeEventListener('abort', handleAbort);
    }
  }
}
```

#### `src/lib/adapters/perplexity-stream-adapter.ts`

```typescript
/**
 * PerplexityStreamAdapter
 *
 * 轉接層：將 Side Project A 的乾淨邏輯轉接到主專案的介面
 */

import { createSimpleChatStream, ChatMessage, StreamCallbacks } from './simple-chat-stream';
import type {
  PerplexityQAInput,
  PerplexityQAResponse,
  PerplexityStreamingChunk,
  PerplexityCitation,
} from '@/types/perplexity-qa';
import {
  PERPLEXITY_CONFIG,
  getPerplexityApiKey,
  isPerplexityConfigured,
  PERPLEXITY_MODELS,
} from '@/ai/perplexity-config';

export class PerplexityStreamAdapter {
  private apiKey: string;

  constructor(apiKey?: string) {
    const key = apiKey || getPerplexityApiKey();
    if (!key) {
      throw new Error('Perplexity API key is required');
    }
    this.apiKey = key;
  }

  /**
   * 串流問答 - 主要方法
   */
  async* streamingQA(
    input: PerplexityQAInput,
  ): AsyncGenerator<PerplexityStreamingChunk> {
    const startTime = Date.now();
    let chunkIndex = 0;

    // 狀態追蹤
    const state = {
      thinkingContent: '',
      answerContent: '',
      citations: [] as string[],
      isComplete: false,
      isThinking: false,
    };

    // 建構紅樓夢專用 prompt
    const prompt = this.buildRedChamberPrompt(input);
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

    // 使用 Promise + 事件佇列 轉換 callbacks 為 AsyncGenerator
    const eventQueue: Array<{ type: string; data?: any }> = [];
    let resolveNext: (() => void) | null = null;
    let rejectNext: ((error: Error) => void) | null = null;

    const callbacks: StreamCallbacks = {
      onThinkingStart: () => {
        state.isThinking = true;
        eventQueue.push({ type: 'thinkingStart' });
        resolveNext?.();
      },
      onThinkingContent: (content) => {
        state.thinkingContent += content;
        eventQueue.push({ type: 'thinkingContent', data: content });
        resolveNext?.();
      },
      onThinkingEnd: () => {
        state.isThinking = false;
        eventQueue.push({ type: 'thinkingEnd' });
        resolveNext?.();
      },
      onContent: (content) => {
        state.answerContent += content;
        eventQueue.push({ type: 'content', data: content });
        resolveNext?.();
      },
      onCitations: (citations) => {
        state.citations = citations;
        eventQueue.push({ type: 'citations', data: citations });
        resolveNext?.();
      },
      onDone: () => {
        state.isComplete = true;
        eventQueue.push({ type: 'done' });
        resolveNext?.();
      },
      onError: (error) => {
        eventQueue.push({ type: 'error', data: error });
        rejectNext?.(error);
      },
    };

    // 啟動串流（非同步）
    const streamPromise = createSimpleChatStream(messages, callbacks, {
      model: PERPLEXITY_MODELS[input.modelKey || 'sonar-reasoning-pro'].name,
      maxTokens: input.maxTokens || 2000,
      temperature: input.temperature || 0.2,
    });

    // 處理事件佇列
    while (!state.isComplete) {
      if (eventQueue.length === 0) {
        // 等待新事件
        await new Promise<void>((resolve, reject) => {
          resolveNext = resolve;
          rejectNext = reject;
        });
      }

      while (eventQueue.length > 0) {
        const event = eventQueue.shift()!;

        if (event.type === 'error') {
          throw event.data;
        }

        // 根據事件類型 yield chunk
        if (['content', 'thinkingContent', 'done'].includes(event.type)) {
          chunkIndex++;
          yield this.createChunk(state, chunkIndex, startTime);
        }
      }
    }

    // 確保串流完成
    await streamPromise;
  }

  /**
   * 非串流問答
   */
  async completionQA(input: PerplexityQAInput): Promise<PerplexityQAResponse> {
    const startTime = Date.now();

    // 使用串流但收集完整回應
    let fullResponse = {
      thinkingContent: '',
      answerContent: '',
      citations: [] as string[],
    };

    for await (const chunk of this.streamingQA(input)) {
      if (chunk.isComplete) {
        fullResponse = {
          thinkingContent: chunk.thinkingContent || '',
          answerContent: chunk.fullContent,
          citations: chunk.citations.map(c => c.url),
        };
      }
    }

    return {
      question: input.userQuestion,
      answer: fullResponse.answerContent,
      rawAnswer: fullResponse.answerContent,
      thinkingContent: fullResponse.thinkingContent,
      citations: this.convertCitations(fullResponse.citations),
      groundingMetadata: {
        searchQueries: [],
        webSources: [],
        groundingSuccessful: fullResponse.citations.length > 0,
      },
      modelUsed: input.modelKey || 'sonar-reasoning-pro',
      modelKey: input.modelKey || 'sonar-reasoning-pro',
      processingTime: (Date.now() - startTime) / 1000,
      success: true,
      streaming: false,
      stoppedByUser: false,
      timestamp: new Date().toISOString(),
      answerLength: fullResponse.answerContent.length,
      questionLength: input.userQuestion.length,
      citationCount: fullResponse.citations.length,
    };
  }

  /**
   * 測試連線
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.completionQA({
        userQuestion: '測試連線',
        maxTokens: 50,
      });
      return { success: result.success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 檢查配置狀態
   */
  isConfigured(): boolean {
    return isPerplexityConfigured();
  }

  /**
   * 建構紅樓夢專用 prompt（保留主專案邏輯）
   */
  private buildRedChamberPrompt(input: PerplexityQAInput): string {
    const basePrompt = '你是一位資深的紅樓夢文學專家，具有深厚的古典文學素養和豐富的研究經驗。';

    const contextPrompts: Record<string, string> = {
      character: '請特別關注人物性格分析、人物關係和角色發展。',
      plot: '請重點分析情節發展、故事結構和敘事技巧。',
      theme: '請深入探討主題思想、象徵意義和文學價值。',
      general: '請提供全面而深入的文學分析。',
    };

    const contextInstruction = contextPrompts[input.questionContext || 'general'];

    let prompt = `${basePrompt}\n\n${contextInstruction}\n\n`;

    if (input.chapterContext) {
      prompt += `當前章回上下文：\n${input.chapterContext}\n\n`;
    }

    if (input.selectedText) {
      prompt += `使用者選取的文字：\n"${input.selectedText}"\n\n`;
    }

    if (input.currentChapter) {
      prompt += `目前閱讀章回：${input.currentChapter}\n\n`;
    }

    prompt += `請針對以下關於《紅樓夢》的問題提供詳細、準確的分析：\n\n`;
    prompt += `問題：${input.userQuestion}\n\n`;
    prompt += `請使用繁體中文回答。`;

    return prompt;
  }

  /**
   * 建立串流 chunk
   */
  private createChunk(
    state: { thinkingContent: string; answerContent: string; citations: string[]; isComplete: boolean },
    chunkIndex: number,
    startTime: number,
  ): PerplexityStreamingChunk {
    return {
      content: state.answerContent,
      fullContent: state.answerContent,
      thinkingContent: state.thinkingContent,
      contentDerivedFromThinking: false,
      timestamp: new Date().toISOString(),
      citations: this.convertCitations(state.citations),
      searchQueries: [],
      metadata: {
        searchQueries: [],
        webSources: [],
        groundingSuccessful: state.citations.length > 0,
      },
      responseTime: (Date.now() - startTime) / 1000,
      isComplete: state.isComplete,
      chunkIndex,
      hasThinkingProcess: state.thinkingContent.length > 0,
    };
  }

  /**
   * 轉換引用格式
   */
  private convertCitations(urls: string[]): PerplexityCitation[] {
    return urls.map((url, index) => ({
      number: String(index + 1),
      title: this.extractTitleFromUrl(url),
      url,
      type: 'web_citation' as const,
      domain: this.extractDomain(url),
    }));
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      const titles: Record<string, string> = {
        'zh.wikipedia.org': '維基百科',
        'baidu.com': '百度百科',
        'zhihu.com': '知乎',
      };
      return titles[domain] || domain;
    } catch {
      return '網路來源';
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
}
```

#### `src/lib/perplexity-feature-flags.ts`

```typescript
/**
 * Perplexity Feature Flags
 *
 * 控制新舊 Adapter 切換
 */

export const PERPLEXITY_FLAGS = {
  /**
   * 啟用新的 Stream Adapter（Side Project A 邏輯）
   * 設定 PERPLEXITY_USE_NEW_ADAPTER=true 啟用
   */
  useNewAdapter: process.env.PERPLEXITY_USE_NEW_ADAPTER === 'true',

  /**
   * 啟用 Adapter 除錯日誌
   * 設定 PERPLEXITY_DEBUG_ADAPTER=true 啟用
   */
  debugAdapter: process.env.PERPLEXITY_DEBUG_ADAPTER === 'true',

  /**
   * 新 Adapter 的流量百分比（0-100）
   * 用於漸進式 rollout
   */
  newAdapterPercentage: parseInt(process.env.PERPLEXITY_NEW_ADAPTER_PERCENTAGE || '0', 10),
} as const;

/**
 * 判斷是否使用新 Adapter
 * 支援百分比流量控制
 */
export function shouldUseNewAdapter(): boolean {
  if (PERPLEXITY_FLAGS.useNewAdapter) return true;

  // 百分比流量控制
  if (PERPLEXITY_FLAGS.newAdapterPercentage > 0) {
    return Math.random() * 100 < PERPLEXITY_FLAGS.newAdapterPercentage;
  }

  return false;
}
```

---

## 步驟 5：測試與風險控管建議

### 5.1 單元測試案例

| 測試案例 | 測試目標 | 預期結果 |
|---------|---------|---------|
| `SimpleThinkParser.parse() with complete tags` | 完整 `<think>...</think>` 標籤解析 | 正確分離 thinking 和 content |
| `SimpleThinkParser.parse() with split tags` | 跨 chunk 的不完整標籤 | Buffer 機制正確保留並在下次 parse 時處理 |
| `SimpleThinkParser.parse() without think tags` | 沒有 think 標籤的純內容 | 全部輸出為 content 類型 |
| `createSimpleChatStream() with abort` | 取消請求 | 正確清理資源，不觸發 onError |
| `PerplexityStreamAdapter.streamingQA()` | 完整串流流程 | 正確 yield PerplexityStreamingChunk |

### 5.2 整合測試案例

| 測試情境 | 步驟 | 預期結果 |
|---------|------|---------|
| 正常問答流程 | 1. 發送問題<br>2. 接收串流回應<br>3. 顯示思考過程<br>4. 顯示最終答案 | UI 正確顯示思考過程和答案，loading 狀態正確結束 |
| 網路中斷恢復 | 1. 發送問題<br>2. 模擬網路中斷<br>3. 恢復網路 | 顯示友善錯誤訊息，支援重試 |
| 使用者取消 | 1. 發送問題<br>2. 在回應中途取消 | 立即停止，釋放資源，不顯示錯誤 |

### 5.3 最大的 3 個風險點與緩解方式

| 風險 | 影響 | 緩解方式 |
|-----|------|---------|
| **類型不相容** | 新 Adapter 回傳的 chunk 格式與 UI 元件預期不符，導致顯示錯誤 | 1. 建立完整的類型測試<br>2. 在 createChunk 中嚴格遵循 PerplexityStreamingChunk 介面<br>3. Feature Flag 漸進 rollout |
| **紅樓夢 prompt 遺失** | 新 Adapter 可能遺漏主專案的專用 prompt 邏輯 | 1. 完整移植 buildRedChamberPrompt()<br>2. 比對新舊 prompt 輸出<br>3. 加入 prompt 單元測試 |
| **效能退化** | AsyncGenerator + 事件佇列可能比原本直接 yield 慢 | 1. 加入效能監控指標<br>2. 比較新舊 Adapter 的 responseTime<br>3. 必要時優化事件佇列實作 |

---

## 附錄：程式碼行數對比

| 模組 | Side Project A | 主專案 | 差異 |
|------|---------------|--------|------|
| API 客戶端 | 262 行 | 1,315 行 | **-80%** |
| Think 解析器 | 197 行 | 842 行 | **-77%** |
| API 路由 | 255 行 | 283 行 | -10% |
| 類型定義 | 169 行 | 347 行 | -51% |
| 配置常數 | 81 行 | 330 行 | -75% |
| **總計** | **964 行** | **3,117 行** | **-69%** |

新 Adapter 預計行數：
- `simple-think-parser.ts`: ~100 行
- `simple-chat-stream.ts`: ~150 行
- `perplexity-stream-adapter.ts`: ~250 行
- `perplexity-feature-flags.ts`: ~30 行
- **總計**: ~530 行

---

## 下一步行動

1. [ ] 建立 `src/lib/adapters/` 目錄
2. [ ] 實作 `SimpleThinkParser` 類別
3. [ ] 實作 `createSimpleChatStream` 函數
4. [ ] 實作 `PerplexityStreamAdapter` 類別
5. [ ] 撰寫單元測試
6. [ ] 設定 Feature Flag 並部署測試
7. [ ] 漸進式 rollout 驗證
8. [ ] 完成切換並清理舊程式碼

---

*文件撰寫者：Claude Code*
*最後更新：2025-12-08*
