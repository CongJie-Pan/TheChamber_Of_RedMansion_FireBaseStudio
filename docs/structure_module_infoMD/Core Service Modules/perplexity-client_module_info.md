# Module: `perplexity-client.ts`

## 1. Module Summary

The `perplexity-client` module implements a comprehensive HTTP client for the Perplexity Sonar API, handling non-streaming (Axios) and streaming (native fetch with ReadableStream) completions for Dream of the Red Chamber Q&A. This module provides Red Chamber-specific prompt engineering, citation extraction with fallback sources, HTML tag cleaning, citation validation, and robust streaming response parsing with extensive debugging logs. The client supports 3 Perplexity models (sonar-pro, sonar-reasoning, sonar-reasoning-pro) with adaptive timeouts and reasoning effort controls.

**2025-11-19 Update:** The streaming implementation was refactored from axios `responseType: 'stream'` to native `fetch` with `ReadableStream.getReader()` to resolve issues with axios streams not being properly async iterable in Next.js server environment. This change provides more reliable SSE streaming and better error handling for empty responses.

**2025-11-27 Update (Critical Fix):** Fixed premature stream termination bug that caused AI Q&A responses to stop after showing only the thinking content (e.g., "我需要...正在分析..."). The fix includes:
1. **Removed early exit on `isComplete`**: Previously, when `finish_reason !== null` was detected, the code would set `shouldStopAfterCurrentBatch=true` and exit before receiving the `[DONE]` signal. This is now fixed to continue processing until the explicit `[DONE]` signal is received, following LobeChat's pattern.
2. **Always yield final completion chunk**: The `[DONE]` handler now always yields a final chunk with `isComplete: true`, even if `fullContent` is empty, ensuring the UI receives the complete state.
3. **Removed hardcoded thinking placeholder**: The page.tsx no longer sets a hardcoded "正在分析您的問題並搜尋相關資料..." text that could be confused with actual AI thinking content.

**2025-11-27 Update (LobeChat Alignment):** Aligned configuration with LobeChat patterns:
1. **Temperature constraint**: Enforced temperature < 2 (Perplexity API limitation). Values >= 2 are treated as undefined.
2. **CORS documentation**: Added documentation noting Perplexity doesn't support browser CORS (server-side only).

**2025-12-01 Update (Stream Processing Architecture):** The streaming functionality now integrates with `PerplexityStreamProcessor` for robust handling of `<think>` tags. See `perplexity-stream-processor_module_info.md` for details on buffered tag parsing, sliding window algorithm for split tags, and critical bug fixes for unmatched closing tag handling.

**2025-12-11 Update (Strict Topic Restriction):** Added strict topic filtering in the `buildPrompt` method to ensure the AI only answers questions related to《紅樓夢》(Dream of the Red Chamber). The system now includes a comprehensive topic restriction block that:
1. **Defines allowed topics**: Character analysis, plot development, themes, author (曹雪芹) background, poetry and allusions in the novel, 紅學 (Red Chamber studies), and relevant Qing Dynasty cultural context.
2. **Enforces topic boundaries**: The AI is instructed to politely refuse questions unrelated to《紅樓夢》with a standard response: "抱歉，此問題不在本系統的回答範圍內。本平台專注於《紅樓夢》的文學研究與學習，請提出與《紅樓夢》相關的問題，我將竭誠為您解答。"
3. **Applies to both adapters**: The restriction is implemented in both `PerplexityClient.buildPrompt()` and `PerplexityStreamAdapter.buildRedChamberPrompt()` to ensure consistency regardless of which adapter is used.

## 2. Module Dependencies

* **Internal Dependencies:**
  * `@/types/perplexity-qa` - Type definitions for QA inputs, responses, citations, streaming chunks, and errors.
  * `@/ai/perplexity-config` - Configuration constants, model definitions, API key retrieval, and header generation.
  * `@/lib/terminal-logger` - Development logging utilities for debugging async generators and streaming.
  * `@/lib/streaming/perplexity-stream-processor` - Buffered stream processor for handling incomplete `<think>` tags (used in API routes, not directly in this client).
* **External Dependencies:**
  * `axios` - HTTP client for REST API requests and streaming responses.

## 3. Public API / Exports

* `PerplexityClient` - Main client class with methods for completions and streaming.
* `getDefaultPerplexityClient(): PerplexityClient` - Returns singleton client instance.
* `resetDefaultClient(): void` - Resets singleton (useful for testing).
* **PerplexityClient Methods:**
  * `completionRequest(input: PerplexityQAInput): Promise<PerplexityQAResponse>` - Non-streaming completion.
  * `streamingCompletionRequest(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk>` - Streaming completion with SSE.
  * `testConnection(): Promise<{ success: boolean; error?: string }>` - API health check.
  * `static isConfigured(): boolean` - Checks if API key is configured.

## 4. Code File Breakdown

### 4.1. `perplexity-client.ts`

* **Purpose:** Implements a production-grade Perplexity API client optimized for classical Chinese literature Q&A. The module's architectural highlights include: (1) **Red Chamber-specific prompt engineering** - Constructs specialized prompts with character/plot/theme context, chapter information, and selected text to guide the AI toward academic literary analysis; (2) **Citation extraction pipeline** - Parses `[1]`, `[2]` markers from text, maps to API citations, extracts friendly titles from domains (維基百科, 知乎, 百度百科), and provides fallback default sources; (3) **HTML cleaning** - Removes `<think>` tags and other HTML artifacts from responses while preserving thinking process when requested; (4) **Streaming with debugging** - Implements AsyncGenerator for SSE responses with comprehensive logging at every chunk to diagnose streaming issues; (5) **Error transformation** - Axios interceptors convert HTTP errors to `PerplexityQAError` with retryable classification.
* **Functions:**
    * `constructor(apiKey?: string)` - Initializes AxiosInstance with base URL, timeout, headers, and interceptors. Throws `PerplexityQAError` if API key missing. Sets up request logging (if `PERPLEXITY_DEBUG='true'`) and response error interceptor that converts Axios errors to structured Perplexity errors with retry flags.
    * `extractCitations(text: string, apiCitations?: string[], webSearchQueries?: string[]): PerplexityCitation[]` - **Core citation processing**. Finds all `[N]` markers in text, maps to API-provided URLs, extracts friendly titles using domain lookup table (支持 Wikipedia, 知乎, 百度百科, CNKI等), limits to max citations from config. Falls back to default Chinese literary sources (維基百科, 國學網) if no citations found. Returns array of structured citations with number, title, URL, type, domain.
    * `extractTitleFromUrl(url: string): string` - Converts domain URLs to friendly Chinese titles using hardcoded mapping. Returns domain name without TLD if no match found, or '網路來源' on error.
    * `extractDomainFromUrl(url: string): string` - Parses domain from URL by removing protocol and www prefix. Returns `'unknown'` on error.
    * `cleanResponse(text: string, showThinking: boolean): string` - **HTML sanitization**. Removes `<think>...</think>` tags from answer text (thinking is extracted separately). Strips div, small, strong, span, p, br tags. Collapses multiple newlines. Trims result. Returns clean Traditional Chinese text for display.
    * `buildPrompt(input: PerplexityQAInput): string` - **Specialized prompt engineering for Red Chamber**. Constructs multi-part prompt with: (1) Expert persona ("資深的紅樓夢文學專家"), (2) Context instructions based on question type (character/plot/theme/general), (3) Chapter context and selected text if provided, (4) User question, (5) Structured answering requirements (核心內容, 文本依據, 文學分析, 歷史背景, 關聯分析), (6) Language instruction (繁體中文, including thinking process). Returns complete prompt string.
    * `completionRequest(input: PerplexityQAInput): Promise<PerplexityQAResponse>` - **Non-streaming completion**. Builds prompt, creates config with model/temperature/maxTokens, makes POST to `/chat/completions`, extracts content from choices[0].message.content, cleans HTML, extracts citations, calculates grounding metadata (confidence score based on citation count), and returns comprehensive response object with answer, citations, metadata, processing time. Catches errors and returns error response with `success: false` instead of throwing.
    * `streamingCompletionRequest(input: PerplexityQAInput): AsyncGenerator<PerplexityStreamingChunk>` - **Streaming completion with SSE (native fetch)**. Uses native `fetch` with `ReadableStream.getReader()` instead of axios for reliable streaming. Reads chunks with `TextDecoder`, parses SSE `data:` lines, accumulates full content, extracts thinking content from `<think>` tags, yields streaming chunks with incremental content + thinking + citations. Adds delay between chunks to prevent UI overwhelm. Yields error chunk if exception occurs or if no chunks are received from the API. Includes extensive console logging (🐛) for debugging.
    * `parseStreamingResponse(stream: any): AsyncGenerator<PerplexityStreamChunk>` - **Legacy SSE parser** (deprecated, kept for reference). Originally used with axios streams but was unreliable in Next.js server environment. The parsing logic is now inlined in `streamingCompletionRequest` using native fetch.
    * `static isConfigured(): boolean` - Delegates to `isPerplexityConfigured()` from config module. Checks if API key environment variable is set.
    * `testConnection(): Promise<{ success: boolean; error?: string }>` - Sends test request (測試連線) to verify API connectivity. Returns success status and error message if failed.
* **Key Classes / Constants / Variables:**
    * `PerplexityClient` - Main client class. Holds `axiosInstance` for HTTP calls and `apiKey` for authentication. Provides instance and static methods.
    * `defaultClient: PerplexityClient | null` - Module-level singleton instance. Created on first `getDefaultPerplexityClient()` call.
    * `PerplexityAPIResponse` - Interface defining Perplexity Chat Completions response structure: `id`, `object`, `created`, `model`, `choices` array, `usage`, `citations`, `web_search_queries`.
    * `PerplexityStreamChunk` - Interface for SSE streaming chunk: `id`, `object`, `created`, `model`, `choices` with `delta` containing incremental `content`, `finish_reason`, `citations`, `web_search_queries`.

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: completionRequest called] --> B[Build specialized Red Chamber prompt];
    B --> C[Create Perplexity config with model/temperature];
    C --> D[POST to /chat/completions with prompt];
    D --> E{Response valid?};
    E -- Invalid --> F[Throw PerplexityQAError];
    E -- Valid --> G[Extract choice[0].message.content];
    G --> H[Clean HTML tags and think tags];
    H --> I[Extract citations from text and API data];
    I --> J[Calculate grounding metadata];
    J --> K[Return PerplexityQAResponse with answer, citations, metadata];
    F --> L[Catch error, return error response];
    L --> M[End];
    K --> M;
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Input1(PerplexityQAInput: question, context, model) --> PromptBuilder[buildPrompt];
    PromptBuilder --> Prompt(Specialized prompt with 5-part structure);
    Prompt --> Config[createPerplexityConfig];
    Config --> API[Axios POST /chat/completions];
    API --> RawResponse(PerplexityAPIResponse);
    RawResponse --> Clean[cleanResponse];
    Clean --> CleanAnswer(HTML-free text);
    RawResponse --> Citations[extractCitations];
    Citations --> CitationArray(PerplexityCitation[]);
    CleanAnswer --> Final[Assemble response];
    CitationArray --> Final;
    Final --> Output(PerplexityQAResponse: answer, citations, grounding metadata);
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
import { getDefaultPerplexityClient } from '@/lib/perplexity-client';
import type { PerplexityQAInput } from '@/types/perplexity-qa';

const client = getDefaultPerplexityClient();

// Non-streaming completion
const input: PerplexityQAInput = {
  userQuestion: '林黛玉的性格特點是什麼？',
  questionContext: 'character',
  currentChapter: '第三回',
  selectedText: '黛玉方進入房時，只見兩個人攙著一位鬢髮如銀的老母迎上來',
  modelKey: 'sonar-reasoning-pro',
  reasoningEffort: 'high',
  maxTokens: 1000,
  enableStreaming: false,
};

const response = await client.completionRequest(input);
console.log(response.answer); // Full answer text
console.log(response.citations); // Array of citations with titles and URLs
console.log(response.groundingMetadata.confidenceScore); // 0-1 score

// Streaming completion
const streamInput = { ...input, enableStreaming: true };
for await (const chunk of client.streamingCompletionRequest(streamInput)) {
  console.log(chunk.content); // Incremental content
  console.log(chunk.thinkingContent); // Thinking process
  console.log(chunk.citations); // Citations so far
  if (chunk.isComplete) break;
}
```
* **Testing:** Testing strategy involves mocking Axios and stream responses:
  - Mock `axios.create` to return stub instance
  - Test `completionRequest` with valid input → returns structured response
  - Test citation extraction with various citation patterns
  - Test HTML cleaning removes all tags correctly
  - Test prompt building includes all context fields
  - Test error handling returns error response instead of throwing
  - Test streaming parser handles SSE format correctly
  - Test connection test succeeds with valid API key
