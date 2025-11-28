/**
 * @fileOverview Perplexity Test Utilities
 *
 * Comprehensive test utilities for Perplexity Q&A functionality testing.
 * All utilities follow the 100% mock strategy (LobeChat pattern).
 *
 * @module tests/utils/perplexity-test-utils
 */

import type { PerplexityStreamingChunk } from '@/lib/perplexity-client';

/**
 * Create a mock SSE (Server-Sent Events) stream
 *
 * Simulates real Perplexity API SSE format: "data: {...}\n\n"
 *
 * @param chunks - Array of objects to be streamed
 * @returns ReadableStream that emits SSE-formatted chunks
 *
 * @example
 * ```typescript
 * const stream = createMockSSEStream([
 *   { content: 'Hello' },
 *   { content: 'World' }
 * ]);
 * ```
 */
export function createMockSSEStream(chunks: any[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        // Emit SSE format: "data: {...}\n\n"
        const sseData = `data: ${JSON.stringify(chunks[index])}\n\n`;
        controller.enqueue(encoder.encode(sseData));
        index++;
      } else {
        // End stream with [DONE] signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });
}

/**
 * Create a realistic mock Perplexity streaming chunk
 *
 * Generates chunks that match the exact structure returned by real Perplexity API.
 *
 * @param options - Chunk configuration
 * @returns Fully-formed PerplexityStreamingChunk
 *
 * @example
 * ```typescript
 * const chunk = createMockPerplexityChunk({
 *   content: '林黛玉',
 *   fullContent: '林黛玉的性格',
 *   chunkIndex: 1,
 * });
 * ```
 */
export function createMockPerplexityChunk(options: {
  content: string;
  fullContent: string;
  chunkIndex: number;
  isComplete?: boolean;
  thinkingContent?: string;
  citations?: Array<{ url: string; title: string; snippet?: string }>;
  searchQueries?: string[];
  contentDerivedFromThinking?: boolean;
  responseTime?: number;
}): PerplexityStreamingChunk {
  return {
    content: options.content,
    fullContent: options.fullContent,
    chunkIndex: options.chunkIndex,
    isComplete: options.isComplete || false,
    thinkingContent: options.thinkingContent || '',
    contentDerivedFromThinking: options.contentDerivedFromThinking || false,
    citations: options.citations || [],
    collectedSearchQueries: options.searchQueries || [],
    responseTime: options.responseTime || Date.now(),
  };
}

/**
 * Pre-defined test scenarios matching real-world usage patterns
 *
 * These scenarios are based on actual Perplexity API behavior and
 * historical bug reports.
 */
export const MOCK_QA_SCENARIOS = {
  /**
   * Standard Q&A flow with thinking and answer
   * Most common scenario in production
   */
  STANDARD_QA: {
    question: '林黛玉的性格特點有哪些？',
    model: 'sonar-reasoning',
    chunks: [
      createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 0,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
      }),
      createMockPerplexityChunk({
        content: '林黛玉',
        fullContent: '林黛玉',
        chunkIndex: 1,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
      }),
      createMockPerplexityChunk({
        content: '的性格',
        fullContent: '林黛玉的性格',
        chunkIndex: 2,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
      }),
      createMockPerplexityChunk({
        content: '特點主要包括：',
        fullContent: '林黛玉的性格特點主要包括：',
        chunkIndex: 3,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
      }),
      createMockPerplexityChunk({
        content: '\n\n1. 敏感多疑',
        fullContent: '林黛玉的性格特點主要包括：\n\n1. 敏感多疑',
        chunkIndex: 4,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
        citations: [
          {
            url: 'https://example.com/redmansion/analysis',
            title: '紅樓夢人物分析',
            snippet: '林黛玉性格敏感...',
          },
        ],
      }),
      createMockPerplexityChunk({
        content: '\n2. 才華橫溢',
        fullContent: '林黛玉的性格特點主要包括：\n\n1. 敏感多疑\n2. 才華橫溢',
        chunkIndex: 5,
        isComplete: true,
        thinkingContent: '正在分析《紅樓夢》中林黛玉的性格描寫...',
        citations: [
          {
            url: 'https://example.com/redmansion/analysis',
            title: '紅樓夢人物分析',
            snippet: '林黛玉性格敏感...',
          },
          {
            url: 'https://example.com/redmansion/poetry',
            title: '林黛玉詩詞賞析',
          },
        ],
        searchQueries: ['林黛玉性格', '紅樓夢人物分析'],
      }),
    ],
  },

  /**
   * Thinking-only response (Task 4.2 bug scenario)
   * AI provides reasoning but no final answer
   */
  THINKING_ONLY: {
    question: '這個問題需要深入思考',
    model: 'sonar-reasoning',
    chunks: [
      createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 0,
        thinkingContent: '這個問題涉及多個層面，需要仔細分析各種可能性...',
        isComplete: true,
      }),
    ],
  },

  /**
   * Short answer (no minimum length validation)
   * Tests removal of MIN_VALID_ANSWER_LENGTH check
   */
  SHORT_ANSWER: {
    question: '黛玉是誰？',
    model: 'sonar-pro',
    chunks: [
      createMockPerplexityChunk({
        content: '是的',
        fullContent: '是的',
        chunkIndex: 0,
        isComplete: true,
      }),
    ],
  },

  /**
   * Multiple thinking blocks
   * Tests handling of consecutive <think> tags
   */
  MULTIPLE_THINKING: {
    question: '複雜的多步驟推理問題',
    model: 'sonar-reasoning',
    chunks: [
      createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 0,
        thinkingContent: '第一步：分析問題背景...',
      }),
      createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 1,
        thinkingContent: '第一步：分析問題背景...\n\n第二步：評估可能方案...',
      }),
      createMockPerplexityChunk({
        content: '綜合分析結果',
        fullContent: '綜合分析結果',
        chunkIndex: 2,
        thinkingContent: '第一步：分析問題背景...\n\n第二步：評估可能方案...',
      }),
      createMockPerplexityChunk({
        content: '如下：',
        fullContent: '綜合分析結果如下：',
        chunkIndex: 3,
        isComplete: true,
        thinkingContent: '第一步：分析問題背景...\n\n第二步：評估可能方案...',
      }),
    ],
  },

  /**
   * Large response (performance test scenario)
   * Tests handling of long content without performance degradation
   */
  LARGE_RESPONSE: {
    question: '詳細介紹紅樓夢的主要情節',
    model: 'sonar-reasoning',
    chunks: (() => {
      const chunks: PerplexityStreamingChunk[] = [];
      const thinkingContent = '正在整理紅樓夢的主要情節...';
      let fullContent = '';

      // Generate 50 chunks to simulate large response
      for (let i = 0; i < 50; i++) {
        const content = `內容片段${i + 1}。`;
        fullContent += content;
        chunks.push(
          createMockPerplexityChunk({
            content,
            fullContent,
            chunkIndex: i,
            thinkingContent,
            isComplete: i === 49,
          })
        );
      }

      return chunks;
    })(),
  },

  /**
   * Response with citations
   * Tests citation extraction and formatting
   */
  WITH_CITATIONS: {
    question: '紅樓夢的作者是誰？',
    model: 'sonar-pro',
    chunks: [
      createMockPerplexityChunk({
        content: '《紅樓夢》',
        fullContent: '《紅樓夢》',
        chunkIndex: 0,
      }),
      createMockPerplexityChunk({
        content: '的作者是',
        fullContent: '《紅樓夢》的作者是',
        chunkIndex: 1,
      }),
      createMockPerplexityChunk({
        content: '曹雪芹',
        fullContent: '《紅樓夢》的作者是曹雪芹',
        chunkIndex: 2,
        isComplete: true,
        citations: [
          {
            url: 'https://zh.wikipedia.org/wiki/紅樓夢',
            title: '紅樓夢 - 維基百科',
            snippet: '《紅樓夢》，原名《石頭記》，作者曹雪芹...',
          },
          {
            url: 'https://example.com/caoxueqin',
            title: '曹雪芹生平',
          },
        ],
        searchQueries: ['紅樓夢作者', '曹雪芹'],
      }),
    ],
  },

  /**
   * Selected text context scenario
   * Tests context-aware questioning
   */
  WITH_SELECTED_TEXT: {
    question: '這段描寫了什麼？',
    selectedText: '黛玉聽了，便放下釣竿，走至座間坐下。',
    model: 'sonar-reasoning',
    chunks: [
      createMockPerplexityChunk({
        content: '',
        fullContent: '',
        chunkIndex: 0,
        thinkingContent: '分析文本內容："黛玉聽了，便放下釣竿，走至座間坐下。"',
      }),
      createMockPerplexityChunk({
        content: '這段描寫了',
        fullContent: '這段描寫了',
        chunkIndex: 1,
        thinkingContent: '分析文本內容："黛玉聽了，便放下釣竿，走至座間坐下。"',
      }),
      createMockPerplexityChunk({
        content: '林黛玉的動作',
        fullContent: '這段描寫了林黛玉的動作',
        chunkIndex: 2,
        isComplete: true,
        thinkingContent: '分析文本內容："黛玉聽了，便放下釣竿，走至座間坐下。"',
      }),
    ],
  },
} as const;

/**
 * Error scenarios for testing error handling
 */
export const MOCK_ERROR_SCENARIOS = {
  /**
   * Network timeout error
   */
  TIMEOUT: {
    error: new Error('Request timeout after 30 seconds'),
    errorType: 'TIMEOUT',
    partialContent: '部分回答內容（在超時前已接收）...',
    retriable: true,
  },

  /**
   * Rate limit error
   */
  RATE_LIMIT: {
    error: new Error('429 Too Many Requests'),
    errorType: 'RATE_LIMIT',
    retriable: true,
    retryAfter: 60,
  },

  /**
   * Invalid API key
   */
  AUTH_ERROR: {
    error: new Error('401 Unauthorized: Invalid API key'),
    errorType: 'AUTH_ERROR',
    retriable: false,
  },

  /**
   * Malformed response
   */
  INVALID_RESPONSE: {
    error: new Error('Invalid JSON in response'),
    errorType: 'PARSE_ERROR',
    retriable: false,
  },

  /**
   * Network disconnection mid-stream
   */
  NETWORK_ERROR: {
    error: new Error('Network connection lost'),
    errorType: 'NETWORK_ERROR',
    partialContent: '林黛玉的性格',
    retriable: true,
  },
} as const;

/**
 * Create a mock Perplexity client
 *
 * Returns a mock client that simulates real API behavior using predefined scenarios.
 *
 * @param scenario - Scenario key or custom generator
 * @returns Mock client object compatible with PerplexityClient interface
 *
 * @example
 * ```typescript
 * const client = createMockPerplexityClient('STANDARD_QA');
 *
 * for await (const chunk of client.streamingCompletionRequest({...})) {
 *   console.log(chunk.content);
 * }
 * ```
 */
export function createMockPerplexityClient(
  scenario: keyof typeof MOCK_QA_SCENARIOS | 'CUSTOM',
  customGenerator?: AsyncGenerator<PerplexityStreamingChunk>
) {
  const scenarioData = scenario === 'CUSTOM' ? null : MOCK_QA_SCENARIOS[scenario];

  return {
    /**
     * Mock streaming completion request
     */
    streamingCompletionRequest: jest.fn().mockImplementation(async function* (params?: any) {
      // Use custom generator if provided
      if (customGenerator) {
        yield* customGenerator;
        return;
      }

      // Use predefined scenario
      if (!scenarioData) {
        throw new Error('Scenario data required for non-custom scenario');
      }

      for (const chunk of scenarioData.chunks) {
        yield chunk;
        // Simulate network delay (10ms per chunk)
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }),

    /**
     * Mock non-streaming completion request
     */
    completionRequest: jest.fn().mockImplementation(async (params?: any) => {
      if (!scenarioData) {
        return {
          answer: '測試回答內容',
          thinking: '測試思考過程',
          citations: [],
        };
      }

      const lastChunk = scenarioData.chunks[scenarioData.chunks.length - 1];
      return {
        answer: lastChunk.fullContent,
        thinking: lastChunk.thinkingContent,
        citations: lastChunk.citations || [],
      };
    }),
  };
}

/**
 * Wait for all SSE events to complete
 *
 * Helper function to consume an SSE stream and collect all emitted chunks.
 *
 * @param response - Response object with SSE body
 * @param onChunk - Optional callback for each chunk
 * @returns Array of all chunks received
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/perplexity-qa-stream', {...});
 * const chunks = await waitForSSECompletion(response, (chunk) => {
 *   console.log('Received:', chunk);
 * });
 * ```
 */
export async function waitForSSECompletion(
  response: Response,
  onChunk?: (chunk: any) => void
): Promise<any[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: any[] = [];
  let buffer = '';

  // Safety limit for test utilities - prevents test hangs from malformed mocks
  const TEST_MAX_READ_ITERATIONS = 5000;
  let readCount = 0;

  while (true) {
    if (++readCount > TEST_MAX_READ_ITERATIONS) {
      throw new Error(
        `Test stream exceeded ${TEST_MAX_READ_ITERATIONS} iterations - likely a mock configuration error`
      );
    }

    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split by double newline (SSE event separator)
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // Keep incomplete event in buffer

    for (const event of events) {
      if (!event.trim()) continue;
      if (event === 'data: [DONE]') break;

      // Parse SSE data
      const match = event.match(/^data: (.+)$/);
      if (match) {
        try {
          const chunk = JSON.parse(match[1]);
          chunks.push(chunk);
          if (onChunk) onChunk(chunk);
        } catch (e) {
          console.error('Failed to parse SSE chunk:', match[1]);
        }
      }
    }
  }

  return chunks;
}

/**
 * Create a mock Next.js Request object
 *
 * Useful for testing API routes.
 *
 * @param body - Request body
 * @param options - Additional request options
 * @returns Request object (compatible with NextRequest)
 */
export function createMockRequest(body: any, options: RequestInit = {}): any {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });
}

/**
 * Assert that chunk follows expected structure
 *
 * Common assertion helper for validating chunk format.
 *
 * @param chunk - Chunk to validate
 */
export function assertValidChunk(chunk: any): asserts chunk is PerplexityStreamingChunk {
  expect(chunk).toHaveProperty('content');
  expect(chunk).toHaveProperty('fullContent');
  expect(chunk).toHaveProperty('chunkIndex');
  expect(chunk).toHaveProperty('isComplete');
  expect(chunk).toHaveProperty('thinkingContent');
  expect(chunk).toHaveProperty('contentDerivedFromThinking');
  expect(chunk).toHaveProperty('citations');
  expect(chunk).toHaveProperty('collectedSearchQueries');

  expect(typeof chunk.content).toBe('string');
  expect(typeof chunk.fullContent).toBe('string');
  expect(typeof chunk.chunkIndex).toBe('number');
  expect(typeof chunk.isComplete).toBe('boolean');
  expect(typeof chunk.thinkingContent).toBe('string');
  expect(Array.isArray(chunk.citations)).toBe(true);
  expect(Array.isArray(chunk.collectedSearchQueries)).toBe(true);
}

/**
 * Safely consume an async generator with proper cleanup
 *
 * Ensures generator is properly closed even if test fails mid-execution.
 * Prevents memory leaks and resource exhaustion in test suites.
 *
 * @param generator - Async generator to consume
 * @param onChunk - Optional callback for each chunk
 * @returns Array of all yielded values
 *
 * @example
 * ```typescript
 * const chunks = await consumeAsyncGenerator(
 *   client.streamingQA(input),
 *   chunk => console.log('Received:', chunk.content)
 * );
 * ```
 */
export async function consumeAsyncGenerator<T>(
  generator: AsyncGenerator<T>,
  onChunk?: (chunk: T) => void
): Promise<T[]> {
  const results: T[] = [];
  try {
    for await (const chunk of generator) {
      results.push(chunk);
      onChunk?.(chunk);
    }
  } finally {
    // Ensure generator is closed even if test throws
    await generator.return?.(undefined);
  }
  return results;
}

/**
 * Safely read a ReadableStream to completion with proper cleanup
 *
 * Ensures stream reader is properly released even if test fails.
 * Prevents "stream already locked" errors in subsequent tests.
 *
 * @param response - Response with readable body
 * @returns Last message from stream
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * const lastMessage = await consumeStreamToEnd(response);
 * expect(lastMessage).toBe('data: [DONE]\\n\\n');
 * ```
 */
export async function consumeStreamToEnd(
  response: Response
): Promise<string> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let lastMessage = '';

  // Safety limit for test utilities - prevents test hangs from malformed mocks
  const TEST_MAX_READ_ITERATIONS = 5000;
  let readCount = 0;

  try {
    while (true) {
      if (++readCount > TEST_MAX_READ_ITERATIONS) {
        throw new Error(
          `Test stream exceeded ${TEST_MAX_READ_ITERATIONS} iterations - likely a mock configuration error`
        );
      }

      const { value, done } = await reader.read();
      if (done) break;
      lastMessage = decoder.decode(value);
    }
    return lastMessage;
  } finally {
    // Always release reader lock to prevent resource leaks
    reader.releaseLock();
  }
}

/**
 * Collect all messages from a ReadableStream with proper cleanup
 *
 * Similar to consumeStreamToEnd but collects all messages, not just the last one.
 *
 * @param response - Response with readable body
 * @returns Array of all messages from stream
 *
 * @example
 * ```typescript
 * const response = await POST(request);
 * const messages = await collectAllStreamMessages(response);
 * expect(messages).toHaveLength(3); // chunk1, chunk2, [DONE]
 * ```
 */
export async function collectAllStreamMessages(
  response: Response
): Promise<string[]> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const messages: string[] = [];

  // Safety limit for test utilities - prevents test hangs from malformed mocks
  const TEST_MAX_READ_ITERATIONS = 5000;
  let readCount = 0;

  try {
    while (true) {
      if (++readCount > TEST_MAX_READ_ITERATIONS) {
        throw new Error(
          `Test stream exceeded ${TEST_MAX_READ_ITERATIONS} iterations - likely a mock configuration error`
        );
      }

      const { value, done } = await reader.read();
      if (done) break;
      messages.push(decoder.decode(value));
    }
    return messages;
  } finally {
    // Always release reader lock to prevent resource leaks
    reader.releaseLock();
  }
}
